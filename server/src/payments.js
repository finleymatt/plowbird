// Payments: Stripe PaymentIntents for customers, Connect Express transfers for drivers.
//
// With STRIPE_SECRET_KEY set (use a test-mode key in development), a job's price + tip is
// authorized on the customer's saved card when the job is created, captured when the driver
// marks it done and voided if it's cancelled. Drivers get driverPayout + tip as a Connect
// transfer tied to that charge. Without a key everything below is simulated with status
// fields only, so local dev works without a Stripe account.
import Stripe from 'stripe';

import { db } from './db.js';

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
export const stripe = secretKey ? new Stripe(secretKey, { maxNetworkRetries: 2, appInfo: { name: 'Plowbird' } }) : null;
export const paymentsMode = stripe ? 'stripe' : 'demo';
if (stripe && !secretKey.startsWith('sk_test_') && !secretKey.startsWith('rk_test_') && process.env.NODE_ENV !== 'production')
  console.warn('STRIPE_SECRET_KEY is not a test-mode key. Real cards will be charged.');

// A payment problem the customer can act on (no card, declined…). Routes turn it into a 402.
export class PaymentError extends Error {
  constructor(message, code = 'payment_failed') {
    super(message);
    this.code = code;
  }
}

const BRANDS = { amex: 'Amex', diners: 'Diners Club', discover: 'Discover', jcb: 'JCB', mastercard: 'Mastercard', unionpay: 'UnionPay', visa: 'Visa' };
const cardSummary = (pm) =>
  pm?.card
    ? {
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year,
        label: `${BRANDS[pm.card.brand] ?? 'Card'} •••• ${pm.card.last4}`,
      }
    : null;

// Stripe card errors (declines, expired cards, authentication required) become PaymentErrors.
async function cardCall(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e?.type === 'StripeCardError')
      throw new PaymentError(
        e.code === 'authentication_required' ? 'Your bank wants to confirm this card. Add it again to verify it.' : e.message,
        e.code ?? 'card_declined',
      );
    throw e;
  }
}

const getUser = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
const jobRow = (id) =>
  db.prepare('SELECT j.*, p.address FROM jobs j JOIN properties p ON p.id = j.property_id WHERE j.id = ?').get(id);

/* ---------------- customers & saved cards ---------------- */

async function customerIdFor(userId) {
  const user = getUser(userId);
  if (user.stripe_customer_id) return user.stripe_customer_id;
  const customer = await stripe.customers.create({
    name: user.name,
    email: user.email,
    phone: user.phone ?? undefined,
    metadata: { plowbird_user_id: String(user.id) },
  });
  // Conditional so two concurrent first requests don't leave an orphaned customer id behind.
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ? AND stripe_customer_id IS NULL').run(customer.id, user.id);
  return getUser(userId).stripe_customer_id;
}

// The customer's default card, falling back to their most recently saved one.
async function defaultPaymentMethod(customerId) {
  const customer = await stripe.customers.retrieve(customerId, { expand: ['invoice_settings.default_payment_method'] });
  if (customer.deleted) return null;
  const pm = customer.invoice_settings?.default_payment_method;
  if (pm && typeof pm === 'object' && pm.card) return pm;
  const { data } = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 });
  return data[0] ?? null;
}

export async function savedCard(userId) {
  if (!stripe) return null;
  const { stripe_customer_id } = getUser(userId);
  return stripe_customer_id ? cardSummary(await defaultPaymentMethod(stripe_customer_id)) : null;
}

// Everything the app needs to collect a card: PaymentSheet (native) or the Payment Element (web).
export async function createCardSetup(userId) {
  const customer = await customerIdFor(userId);
  const [setupIntent, session] = await Promise.all([
    stripe.setupIntents.create({
      customer,
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: { plowbird_user_id: String(userId) },
    }),
    stripe.customerSessions.create({
      customer,
      components: {
        mobile_payment_element: {
          enabled: true,
          features: { payment_method_save: 'enabled', payment_method_redisplay: 'enabled', payment_method_remove: 'enabled' },
        },
      },
    }),
  ]);
  return { customerId: customer, setupIntentClientSecret: setupIntent.client_secret, customerSessionClientSecret: session.client_secret };
}

// Called by the app once the SetupIntent succeeds: make that card the one we charge.
export async function finishCardSetup(userId, setupIntentId) {
  const customer = await customerIdFor(userId);
  const si = await stripe.setupIntents.retrieve(String(setupIntentId));
  if (si.customer !== customer) throw new PaymentError('That card setup belongs to another account', 'invalid_setup');
  if (si.status !== 'succeeded' || !si.payment_method) throw new PaymentError("Your card wasn't saved. Try again.", 'setup_incomplete');
  const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method.id;
  await stripe.customers.update(customer, { invoice_settings: { default_payment_method: pmId } });
  return cardSummary(await stripe.paymentMethods.retrieve(pmId));
}

/* ---------------- job charges ---------------- */

// Off-session charge on the saved card. Manual capture holds the money until the job is done.
async function chargeSavedCard(job, amount, { capture, kind }) {
  const customer = await customerIdFor(job.customer_id);
  const pm = await defaultPaymentMethod(customer);
  if (!pm) throw new PaymentError('Add a card before requesting a plow.', 'card_required');
  const pi = await cardCall(() =>
    stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer,
      payment_method: pm.id,
      payment_method_types: ['card'],
      capture_method: capture ? 'automatic' : 'manual',
      confirm: true,
      off_session: true,
      description: `Plowbird ${kind === 'tip' ? 'tip' : 'plow'} · job #${job.id} · ${job.address}`,
      transfer_group: `job_${job.id}`,
      metadata: { plowbird_job_id: String(job.id), kind },
    }),
  );
  const ok = capture ? pi.status === 'succeeded' : pi.status === 'requires_capture';
  if (!ok) {
    if (pi.status !== 'canceled') await stripe.paymentIntents.cancel(pi.id).catch(() => {});
    throw new PaymentError("Your card couldn't be charged. Try another card.", pi.status);
  }
  return { pi, card: cardSummary(pm) };
}

const insertPayment = (jobId, kind, pi, amount, status) =>
  db
    .prepare('INSERT INTO payments (job_id, kind, payment_intent_id, charge_id, amount_cents, status) VALUES (?, ?, ?, ?, ?, ?)')
    .run(jobId, kind, pi.id, typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? null, amount, status);

const jobPayment = (jobId) => db.prepare("SELECT * FROM payments WHERE job_id = ? AND kind = 'job' ORDER BY id DESC LIMIT 1").get(jobId);

// Put a hold for price + tip on the customer's card. Throws PaymentError if it's declined.
export async function authorizeJob(jobId) {
  if (!stripe) return;
  const job = jobRow(jobId);
  const amount = job.price_cents + job.tip_cents;
  const { pi, card } = await chargeSavedCard(job, amount, { capture: false, kind: 'job' });
  insertPayment(job.id, 'job', pi, amount, 'authorized');
  db.prepare("UPDATE jobs SET payment_status = 'authorized', card_label = ? WHERE id = ?").run(card?.label ?? null, job.id);
}

// Release the hold. Called after the job is already marked cancelled, so failures only log.
export async function voidJob(jobId) {
  db.prepare("UPDATE jobs SET payment_status = 'voided' WHERE id = ?").run(jobId);
  const payment = stripe && jobPayment(jobId);
  if (!payment || payment.status !== 'authorized') return;
  try {
    await stripe.paymentIntents.cancel(payment.payment_intent_id, { cancellation_reason: 'requested_by_customer' });
  } catch (e) {
    // Already cancelled (e.g. the 7-day authorization lapsed) is fine.
    if (e?.code !== 'payment_intent_unexpected_state') console.error(`void job #${jobId} failed`, e.message);
  }
  db.prepare("UPDATE payments SET status = 'voided' WHERE id = ?").run(payment.id);
}

// Job done: capture price + tip, charge any tip above the hold separately, and queue the
// driver's transfer. Returns false if the card couldn't be charged.
export async function settleJob(jobId) {
  const job = jobRow(jobId);
  if (job.covered) return settleCoveredJob(job);
  if (!stripe) {
    db.prepare("UPDATE jobs SET payment_status = 'captured' WHERE id = ?").run(jobId);
    return true;
  }
  const quote = JSON.parse(job.quote_json);
  const due = job.price_cents + job.tip_cents;
  try {
    let charged = 0;
    let mainCharge = null;
    const payment = jobPayment(jobId);
    const pi = payment && (await stripe.paymentIntents.retrieve(payment.payment_intent_id));
    if (pi?.status === 'requires_capture') {
      const amount = Math.min(due, pi.amount_capturable);
      const captured = await stripe.paymentIntents.capture(pi.id, { amount_to_capture: amount });
      db.prepare("UPDATE payments SET status = 'captured', amount_cents = ?, charge_id = ? WHERE id = ?").run(amount, captured.latest_charge, payment.id);
      charged = amount;
      mainCharge = captured.latest_charge;
    } else if (pi?.status === 'succeeded') {
      charged = pi.amount_received; // captured on an earlier attempt
      mainCharge = pi.latest_charge;
    } else {
      // No hold, or it lapsed (card holds expire after 7 days, e.g. far-out scheduled jobs).
      const fresh = await chargeSavedCard(job, due, { capture: true, kind: 'job' });
      if (payment) db.prepare("UPDATE payments SET status = 'voided' WHERE id = ?").run(payment.id);
      insertPayment(job.id, 'job', fresh.pi, due, 'captured');
      charged = due;
      mainCharge = fresh.pi.latest_charge;
    }
    // The main charge covers the driver's share plus as much of the tip as fit in the hold.
    queuePayout(job, quote.driverPayout + Math.max(0, Math.min(job.tip_cents, charged - job.price_cents)), mainCharge);
    if (due > charged) {
      const extra = await chargeSavedCard(job, due - charged, { capture: true, kind: 'tip' });
      insertPayment(job.id, 'tip', extra.pi, due - charged, 'captured');
      queuePayout(job, due - charged, extra.pi.latest_charge);
    }
    db.prepare("UPDATE jobs SET payment_status = 'captured' WHERE id = ?").run(jobId);
    return true;
  } catch (e) {
    console.error(`settling job #${jobId} failed`, e.message);
    db.prepare("UPDATE jobs SET payment_status = 'failed' WHERE id = ?").run(jobId);
    return false;
  } finally {
    if (job.driver_id) await flushPayouts(job.driver_id).catch((e) => console.error('payout flush failed', e.message));
  }
}

// A tip added after the job was charged gets its own charge, all of it transferred to the driver.
export async function chargeExtraTip(jobId, cents) {
  if (!stripe || cents <= 0) return;
  const job = jobRow(jobId);
  const { pi } = await chargeSavedCard(job, cents, { capture: true, kind: 'tip' });
  insertPayment(job.id, 'tip', pi, cents, 'captured');
  if (job.driver_id) {
    queuePayout(job, cents, pi.latest_charge);
    await flushPayouts(job.driver_id).catch((e) => console.error('payout flush failed', e.message));
  }
}

/* ---------------- driver payouts (Connect Express) ---------------- */

// A Storm Pass plow: nothing to charge for the job itself (the subscription pays). Any tip is its own
// charge. The driver's share is paid from the platform balance, so it has no source charge ('').
async function settleCoveredJob(job) {
  db.prepare("UPDATE jobs SET payment_status = 'covered' WHERE id = ?").run(job.id);
  if (!stripe) return true;
  const quote = JSON.parse(job.quote_json);
  try {
    queuePayout(job, quote.driverPayout, '', true);
    if (job.tip_cents > 0) {
      const { pi } = await chargeSavedCard(job, job.tip_cents, { capture: true, kind: 'tip' });
      insertPayment(job.id, 'tip', pi, job.tip_cents, 'captured');
      queuePayout(job, job.tip_cents, pi.latest_charge);
    }
    return true;
  } catch (e) {
    console.error(`settling covered job #${job.id} failed`, e.message);
    return false;
  } finally {
    if (job.driver_id) await flushPayouts(job.driver_id).catch((e) => console.error('payout flush failed', e.message));
  }
}

function queuePayout(job, amount, chargeId, fromBalance = false) {
  if (!job.driver_id || amount <= 0 || (!chargeId && !fromBalance)) return;
  db.prepare('INSERT INTO payouts (job_id, driver_id, amount_cents, charge_id) VALUES (?, ?, ?, ?)').run(job.id, job.driver_id, amount, chargeId);
}

const transfersActive = (account) => account?.capabilities?.transfers === 'active';

// Send every pending transfer for a driver whose Express account can receive them.
// source_transaction lets the transfer go out before the charge's funds settle.
async function flushPayouts(driverId, account) {
  const { stripe_account_id } = getUser(driverId);
  if (!stripe || !stripe_account_id) return;
  const pending = db.prepare("SELECT * FROM payouts WHERE driver_id = ? AND status = 'pending' ORDER BY id").all(driverId);
  if (!pending.length) return;
  account ??= await stripe.accounts.retrieve(stripe_account_id);
  if (!transfersActive(account)) return;
  for (const p of pending) {
    // Claim the row first so a concurrent flush can't send it twice.
    if (!db.prepare("UPDATE payouts SET status = 'paid' WHERE id = ? AND status = 'pending'").run(p.id).changes) continue;
    try {
      const transfer = await stripe.transfers.create(
        {
          amount: p.amount_cents,
          currency: 'usd',
          destination: stripe_account_id,
          // Tied to the customer's charge when there is one; Storm Pass plows come from the balance.
          ...(p.charge_id ? { source_transaction: p.charge_id } : {}),
          transfer_group: `job_${p.job_id}`,
          description: `Plowbird job #${p.job_id}`,
          metadata: { plowbird_job_id: String(p.job_id), plowbird_payout_id: String(p.id) },
        },
        { idempotencyKey: `plowbird-payout-${p.id}-${p.charge_id}` },
      );
      db.prepare('UPDATE payouts SET transfer_id = ?, error = NULL WHERE id = ?').run(transfer.id, p.id);
    } catch (e) {
      console.error(`payout #${p.id} failed`, e.message);
      db.prepare("UPDATE payouts SET status = 'failed', error = ? WHERE id = ?").run(e.message, p.id);
    }
  }
}

function payoutTotals(driverId) {
  const sum = (status) =>
    db.prepare('SELECT COALESCE(SUM(amount_cents), 0) n FROM payouts WHERE driver_id = ? AND status = ?').get(driverId, status).n;
  return { pendingCents: sum('pending'), paidCents: sum('paid'), failedCents: sum('failed') };
}

export async function payoutStatus(driverId) {
  if (!stripe) return { mode: 'demo' };
  const { stripe_account_id } = getUser(driverId);
  if (!stripe_account_id) return { mode: 'stripe', status: 'not_started', ...payoutTotals(driverId) };
  const account = await stripe.accounts.retrieve(stripe_account_id);
  await flushPayouts(driverId, account);
  const due = account.requirements?.currently_due?.length ?? 0;
  const status =
    transfersActive(account) && account.payouts_enabled ? 'active' : !account.details_submitted || due ? 'incomplete' : 'pending';
  return { mode: 'stripe', status, ...payoutTotals(driverId) };
}

// Stripe-hosted onboarding for the driver's Express account. Both URLs bring them back to the app,
// which re-checks the status (an expired link just shows "Finish setup" again).
export async function payoutOnboardingLink(driverId, returnUrl) {
  const user = getUser(driverId);
  let accountId = user.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'US',
      email: user.email,
      business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      business_profile: { product_description: 'Residential snow plowing through Plowbird', mcc: '0780' },
      metadata: { plowbird_user_id: String(user.id) },
    });
    db.prepare('UPDATE users SET stripe_account_id = ? WHERE id = ? AND stripe_account_id IS NULL').run(account.id, user.id);
    accountId = getUser(driverId).stripe_account_id;
  }
  const link = await stripe.accountLinks.create({ account: accountId, type: 'account_onboarding', return_url: returnUrl, refresh_url: returnUrl });
  return link.url;
}

export async function payoutDashboardLink(driverId) {
  const { stripe_account_id } = getUser(driverId);
  if (!stripe_account_id) throw new PaymentError('Set up payouts first', 'payouts_not_set_up');
  return (await stripe.accounts.createLoginLink(stripe_account_id)).url;
}

/* ---------------- Storm Pass billing ---------------- */

let passProductId = null;
// One Stripe product for all Storm Pass prices; found by metadata, created on first use.
async function stormPassProduct() {
  if (passProductId) return passProductId;
  const found = await stripe.products.search({ query: "metadata['plowbird']:'storm_pass'" }).catch(() => ({ data: [] }));
  passProductId = found.data[0]?.id ?? (await stripe.products.create({ name: 'Plowbird Storm Pass', metadata: { plowbird: 'storm_pass' } })).id;
  return passProductId;
}

// Start monthly billing on the customer's saved card. Returns { stripeSubscriptionId, renewsAt }.
// Without Stripe keys it's simulated: no charge, renews in a month.
export async function startStormPassBilling(userId, property, priceCents) {
  const nextMonth = new Date(Date.now() + 30 * 86400_000).toISOString();
  if (!stripe) return { stripeSubscriptionId: null, renewsAt: nextMonth };
  const customer = await customerIdFor(userId);
  const pm = await defaultPaymentMethod(customer);
  if (!pm) throw new PaymentError('Add a card to start your Storm Pass.', 'card_required');
  const sub = await cardCall(async () =>
    stripe.subscriptions.create({
      customer,
      default_payment_method: pm.id,
      items: [{ price_data: { currency: 'usd', product: await stormPassProduct(), unit_amount: priceCents, recurring: { interval: 'month' } } }],
      payment_behavior: 'error_if_incomplete',
      description: `Storm Pass · ${property.address}`,
      metadata: { plowbird_property_id: String(property.id) },
    }),
  );
  const end = sub.items?.data?.[0]?.current_period_end ?? sub.current_period_end;
  return { stripeSubscriptionId: sub.id, renewsAt: end ? new Date(end * 1000).toISOString() : nextMonth };
}

// Stop renewing; coverage continues to the end of the paid period. Returns that end date.
export async function stopStormPassBilling(sub) {
  if (!stripe || !sub.stripe_subscription_id) return sub.renews_at ?? new Date().toISOString();
  const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, { cancel_at_period_end: true });
  const end = updated.items?.data?.[0]?.current_period_end ?? updated.current_period_end;
  return end ? new Date(end * 1000).toISOString() : sub.renews_at;
}
