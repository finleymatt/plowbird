// Promo codes: a fixed amount off the customer's price. The platform absorbs the discount, so
// quote.driverPayout never changes and the driver is paid as if no code was used.
//
// FIRSTPLOW ($10 off the first plow) is printed on the launch flyers, so its rules match them:
// new customers only (no earlier completed or open job), one per customer and one per household
// (address), until the end of March 31, 2027 in Minnesota. Cancelled jobs don't use up the code.
import { db } from './db.js';
import { referralPromo } from './referrals.js';

db.exec(`
CREATE TABLE IF NOT EXISTS promo_codes (
  code               TEXT PRIMARY KEY COLLATE NOCASE,
  amount_cents       INTEGER NOT NULL,
  label              TEXT NOT NULL,
  new_customers_only INTEGER NOT NULL DEFAULT 1,
  expires_at         TEXT,
  active             INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
`);

// Midnight Central (CDT, UTC-5) at the start of April 1, so March 31 is the last good day.
db.prepare('INSERT OR IGNORE INTO promo_codes (code, amount_cents, label, new_customers_only, expires_at) VALUES (?, ?, ?, 1, ?)').run(
  'FIRSTPLOW',
  1000,
  '$10 off your first plow',
  '2027-04-01T05:00:00.000Z',
);

// The customer can fix it (wrong code, expired, already used). Routes turn it into a 400.
export class PromoError extends Error {}

export const normalizeCode = (code) => String(code ?? '').trim().toUpperCase();

// The promo `code` is good for this customer and address, or a PromoError saying why not.
// Without a customer (a visitor pricing a plow) only the code itself and the address are checked.
export function checkPromo(code, { customerId = null, address = null } = {}) {
  const c = normalizeCode(code);
  let promo = c && db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(c);
  // Not a promo code: maybe a neighbor's referral code (referrals.js).
  if (!promo && c) {
    try {
      promo = referralPromo(c, customerId);
    } catch (e) {
      throw new PromoError(e.message);
    }
  }
  if (!promo || !promo.active) throw new PromoError(`${c || 'That'} isn't a valid promo code`);
  if (promo.expires_at && Date.parse(promo.expires_at) <= Date.now()) throw new PromoError(`${promo.code} has expired`);
  if (customerId != null) {
    const used = db
      .prepare("SELECT 1 FROM jobs WHERE customer_id = ? AND promo_code = ? COLLATE NOCASE AND status != 'cancelled'")
      .get(customerId, promo.code);
    if (used) throw new PromoError(`You've already used ${promo.code}`);
    if (promo.new_customers_only && db.prepare("SELECT 1 FROM jobs WHERE customer_id = ? AND status != 'cancelled'").get(customerId))
      throw new PromoError(`${promo.code} is for new customers' first plow only`);
  }
  if (address?.trim()) {
    const household = db
      .prepare(
        `SELECT 1 FROM jobs j JOIN properties p ON p.id = j.property_id
         WHERE j.promo_code = ? COLLATE NOCASE AND j.status != 'cancelled' AND lower(trim(p.address)) = lower(trim(?))
           AND (? IS NULL OR j.customer_id != ?)`,
      )
      .get(promo.code, address, customerId, customerId);
    if (household) throw new PromoError(`${promo.code} was already used at this address (one per household)`);
    // Referral discounts are for households new to Plowbird, whichever account plowed there before.
    if (promo.referrerId) {
      const plowedHere = db
        .prepare(
          `SELECT 1 FROM jobs j JOIN properties p ON p.id = j.property_id
           WHERE j.status != 'cancelled' AND lower(trim(p.address)) = lower(trim(?)) AND (? IS NULL OR j.customer_id != ?)`,
        )
        .get(address, customerId, customerId);
      if (plowedHere) throw new PromoError('Referral discounts are for homes new to Plowbird');
    }
  }
  return promo;
}

// The quote with the promo taken off: a negative line, a lower total, the same driver payout.
export function applyPromo(quote, promo) {
  const cents = Math.min(promo.amount_cents, quote.total);
  return {
    ...quote,
    lines: [...quote.lines, { label: promo.referrerId ? `Neighbor referral (${promo.label.replace(/^\$\d+ off from /, '')})` : `Promo ${promo.code}`, cents: -cents }],
    totalBeforeDiscount: quote.total,
    total: quote.total - cents,
    promo: { code: promo.code, label: promo.label, cents },
  };
}

// For price previews: apply the code if it's good, otherwise return the plain quote and the reason.
export function quoteWithPromo(quote, code, who) {
  if (!normalizeCode(code)) return quote;
  try {
    return applyPromo(quote, checkPromo(code, who));
  } catch (e) {
    if (e instanceof PromoError) return { ...quote, promoError: e.message };
    throw e;
  }
}
