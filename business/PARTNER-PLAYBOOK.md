# Plowbird partner playbook: business side

**Owner:** Danny (marketing, customer acquisition, hiring, financials)
**Tech owner:** Matt (app, server, payments setup, deploys)
**Written:** Oct 21, 2026
**Launch goal:** live for real orders before the first plowable snow (2"+) in the Twin Cities, usually mid-to-late November. **Treat Nov 13 as launch-ready day** so we're covered if snow comes early.

This is the list of things only a person can do: sign, pay, call, verify, decide. Claude can draft almost everything here (emails, ads, scripts, budgets, spreadsheets), but a human has to send it, sign it or pay for it. The context file for your Claude is [`CLAUDE.md`](CLAUDE.md) in this folder.

Related docs:
- [`marketing/GAMEPLAN.md`](../marketing/GAMEPLAN.md): the go-to-market plan
- [`marketing/handoff/README.md`](../marketing/handoff/README.md): marketing brief (numbers, links, brand, rules)
- [`marketing/outreach/`](../marketing/outreach/): contact lists and ready-to-post copy

> Nothing here is legal, tax or insurance advice. Items marked ⚖️ should be confirmed with an attorney, CPA or insurance broker before you rely on them.

---

## 0. Decide together first (this week)

These block almost everything else. Write the answers down in this file or a shared doc.

| | Decision | Why it blocks |
|---|---|---|
| ☐ | **Ownership split, roles, vesting, who can spend how much without the other** | Goes into the LLC operating agreement. Do this before money moves. ⚖️ |
| ☐ | **Who forms the LLC and is the listed organizer / manager** | Stripe, the bank and insurance all need one legal entity and a named owner with an SSN. |
| ☐ | **Launch budget** (see §5) and who funds it | Printing, insurance and ads can't start without it. |
| ☐ | **Final pilot ZIP codes** | Matt sets them in the app (`SERVICE_ZIPS`). All marketing points at them. Pick where your first drivers live. |
| ☐ | **Support contact** (email + phone) | Goes on the Contact page, flyers and Google Business Profile. |
| ☐ | **Launch-week driver guarantee: yes/no, and the amount** | It changes the driver pitch and the budget. |

---

## 1. Week by week to launch

### Week 1: Oct 21–27 (business setup)

**Legal and entity**
1. ☐ **Partnership / operating agreement.** Book an hour with a Minnesota small-business attorney. Bring the §0 answers. ⚖️
2. ☐ **Form the Minnesota LLC** online at the MN Secretary of State (sos.state.mn.us → Business & Liens → Start a business). Same-day online. Check the current filing fee there.
3. ☐ **Get an EIN** free at irs.gov (Apply for an EIN online, ~10 minutes, issued immediately). Never pay a third-party site for this.
4. ☐ **Register with MN Revenue** (Minnesota tax ID) if your CPA says you need one. Ask specifically whether residential snow plowing is taxable in Minnesota and whether Storm Pass subscriptions are treated differently. ⚖️
5. ☐ **City license check.** Ask Richfield, Edina, Bloomington, St. Louis Park, Roseville and Maplewood whether a marketplace (not the plow operator) needs a business license or a solicitor permit for door-hanger drops.

**Money**
6. ☐ **Business bank account** in the LLC's name (needs the EIN and Articles of Organization). Order a debit card for ad and print spend.
7. ☐ **Bookkeeping**: set up QuickBooks Online, Wave or similar, connected to the bank account and Stripe. Pick a CPA who handles small marketplaces.
8. ☐ **Hand Matt the Stripe live-mode details**: legal name, EIN, business address, bank account and the owner's identity info. Matt does the dashboard and keys; you supply the business facts.

**Insurance** ⚖️
9. ☐ **Get quotes from an independent commercial broker** (not a single-carrier agent). Ask for:
   - general liability for Plowbird as a marketplace
   - hired and non-owned auto (covers Plowbird if someone drives for the business in a car it doesn't own)
   - whether you need an umbrella
   - what minimum coverage to require from drivers (e.g. $1M general liability, commercial auto with plow endorsement) and whether drivers should name Plowbird as an additional insured
10. ☐ Send the broker's driver-insurance minimums to Matt so the `/drive` form and ads match.

**Accounts you own (create with a Plowbird email, add Matt as a second admin)**
11. ☐ Support mailbox `support@plowbird.app` (forwarding is fine) and a Google Voice number.
12. ☐ **Google Business Profile**. Start now: verification can take days to weeks. Copy is in `marketing/outreach/google-business-profile.md`. Use a service-area business with no public address.
13. ☐ **Nextdoor business page**, **Facebook page**, **Instagram**, **Mailchimp** (or similar). Mailchimp needs the LLC's mailing address in every email (CAN-SPAM). A PO box or virtual mailbox works if you don't want a home address on it.

### Week 2: Oct 28 – Nov 3 (drivers)

Target: **20+ applications**, so that 10–15 pass vetting.

1. ☐ **Post driver ads**: Craigslist gigs + skilled trades, Facebook plow and snow-removal groups, local buy/sell groups. Copy and where to post: `marketing/outreach/`. Tag links (`/drive?utm_source=craigslist&utm_campaign=gig`).
2. ☐ **Call the landscapers and plow businesses** in `marketing/outreach/driver-leads.csv` using `cold-email-and-phone-script.md`. Log every call (date, outcome, follow-up) in a sheet.
3. ☐ **Drop driver posters** at plow dealers, farm-supply and hardware stores (`marketing/print/plowbird-driver-poster.pdf`). Ask first.
4. ☐ **Vet each applicant** (they apply at plowbird.app/drive):
   - 10-minute phone call
   - photo of driver's license, truck and plow
   - certificate of insurance (COI) meeting the broker's minimums, with Plowbird as additional insured if the broker recommends it
   - keep copies in a private, access-limited folder, not in GitHub
5. ☐ **Approve drivers at plowbird.app/admin** (Matt adds your email to `ADMIN_EMAILS` first).
6. ☐ **Driver contractor terms** ⚖️. Drivers are independent contractors. Have the attorney review the driver terms and Minnesota's misclassification rules. Don't set their hours, require uniforms, or forbid them from other plow work.
7. ☐ **Book partner newsletter slots now.** Neighborhood newsletters often close a few weeks ahead. Use `partner-email-neighborhoods-hoas.md` and `neighborhood-orgs.csv`. Email HOA management companies (`hoas.csv`).

### Week 3: Nov 4–10 (customers)

Target: **300–500 waitlist signups** in the pilot ZIPs by first snow.

1. ☐ **Print**: customer posters and coupon cards (`marketing/print/`). Test-scan every QR from 2 ft on an iPhone and an Android before a full run. Use a local print shop for card stock.
2. ☐ **Post posters** at co-ops, libraries, coffee shops, hardware stores and community centers in the pilot suburbs (`places-to-post.md` has addresses). Ask first.
3. ☐ **Door-drop coupon cards** on long-driveway blocks: doors and porches only, never in mailboxes, and only where the city allows it.
4. ☐ **Post in Nextdoor and local Facebook groups** (`customer-posts.md`). Follow each group's promo rules.
5. ☐ **Realtors and property managers**: offer a "first snow on us" closing gift. Get the budget agreed first.
6. ☐ **Prep the launch email** in Mailchimp (`marketing/print/plowbird-email.zip`) and a "snow emergency tonight" post, ready to send.
7. ☐ **Driver kickoff call**: walk every approved driver through the app, payouts (Stripe Express setup on the Earnings tab), and what to do on a storm night. Make sure each one has finished payout setup.

### Week 4: Nov 11–17 (launch readiness)

1. ☐ **Go / no-go check** with Matt (§3).
2. ☐ **Dry run**: you place a real paid order in a pilot ZIP, a real driver takes it, payment captures, the driver payout shows. Refund it afterward if you want.
3. ☐ **Storm-night roster**: which drivers commit to being online for the first storm, by suburb. Have their phone numbers.
4. ☐ **Watch the forecast** (weather.gov/mpx). When 2"+ is forecast, run the storm playbook (§4).

---

## 2. Ongoing responsibilities after launch

### Marketing and acquisition
- Weekly: check sign-ups by source (ask Matt for the `/api/admin/sources` report, or pull it yourself once you're an admin), move budget toward what works.
- After every storm: ask happy customers for Google reviews within 24 hours.
- December: Storm Pass push (snowbirds, older homeowners, adult children of older homeowners).
- Referral program ("give $10, get $10"): decide the budget, then ask Matt to build it.

### Hiring
- **Drivers** are contractors, recruited continuously. Target 2+ per pilot suburb before expanding to new ZIPs.
- **Employees** (e.g. a storm-night dispatcher, part-time support): before the first W-2 hire you need MN unemployment insurance registration, Minnesota workers' compensation coverage, payroll (Gusto or similar), and an I-9/W-4 process. ⚖️ Talk to the CPA first. A 1099 contractor can work for short gigs, but not for someone you schedule and direct like an employee.

### Financials
- **Weekly**: reconcile Stripe payouts against the bank. Track revenue, driver payouts, Stripe fees, promo cost, ad spend.
- **Monthly**: P&L, cash on hand, burn, cost per acquired customer by channel.
- **Quarterly**: estimated taxes (CPA), sales tax filing if required.
- **January**: driver 1099s. Stripe Connect can file and deliver 1099s for Express accounts. Turn on 1099 filing in the Stripe dashboard (with Matt) and confirm driver tax info is collected. ⚖️
- **Unit economics to watch** (2-car driveway, before promo): customer pays $49.50, driver gets $36, Plowbird keeps $13.50 minus ~$1.75 Stripe ≈ **$11.75**. FIRSTPLOW costs $10 on the first job, so it pays back on the second order or a Storm Pass.

---

## 3. Launch go / no-go (both of you sign off)

| | Check | Owner |
|---|---|---|
| ☐ | LLC, EIN, bank account, operating agreement signed | Danny |
| ☐ | Insurance bound (policy in hand, not a quote) | Danny |
| ☐ | Stripe live mode activated, Connect Express on, live keys deployed | Matt (with Danny's business info) |
| ☐ | `DEMO_MODE` off, `SERVICE_ZIPS` set to the pilot ZIPs | Matt |
| ☐ | Terms and Privacy reviewed by the attorney, draft notices removed, legal entity and mailing address filled in | Danny (review), Matt (code) |
| ☐ | Support email and phone answered | Danny |
| ☐ | 10+ approved drivers with payouts set up, 2+ per pilot suburb | Danny |
| ☐ | Dry-run order completed end to end | Both |
| ☐ | Storm-night roster and on-call plan | Danny |

---

## 4. Storm-night playbook

**Evening before (2"+ forecast):**
1. Text every approved driver: storm timing, ask who's going online.
2. Around 7 pm, send the waitlist email and post in neighborhood groups.
3. If Minneapolis or St. Paul declares a snow emergency, post the "snow emergency tonight" version.

**During the storm:**
1. Watch orders live (`/admin`). Every order has to be accepted. Orders auto-cancel and release the card hold after 10 minutes with no driver.
2. If orders are waiting, call drivers directly.
3. Answer support messages fast. Note every problem for the post-storm review.

**Morning after:**
1. Ask for Google reviews.
2. Pay any launch guarantee promised to drivers.
3. Post-storm review with Matt: acceptance rate, time to accept, cancellations, complaints, what broke.

---

## 5. Launch budget worksheet (fill in real quotes)

| Item | Estimate | Actual |
|---|---|---|
| LLC filing (MN SOS) | check sos.state.mn.us | |
| Attorney (operating agreement, terms review, contractor terms) | get a flat-fee quote | |
| Insurance (first-year premium or first installment) | broker quote | |
| Printing: posters + card stock | local print shop quote | |
| Craigslist posts | see `places-to-post.md` | |
| Paid social / Nextdoor ads (optional) | you set the cap | |
| FIRSTPLOW promo cost | $10 × expected first orders | |
| Launch-week driver guarantee (optional) | $/hr × drivers × hours | |
| Google Voice, mailbox, domain email | small monthly | |
| Bookkeeping software | monthly | |

---

## 6. What Danny needs from Matt (tech)

| | Ask | When |
|---|---|---|
| ☐ | Add Danny's email to `ADMIN_EMAILS` so he can approve drivers and pull the waitlist and source reports | Week 1 |
| ☐ | Set `SERVICE_ZIPS` once the pilot ZIPs are picked | Week 2 |
| ☐ | Update the Contact page with the support email/phone | Week 1–2 |
| ☐ | Update the `/drive` form and Terms with the broker's insurance minimums and the legal entity name and address | Week 3 |
| ☐ | Add per-partner promo codes (e.g. `RICHFIELD10`) before any partner publishes one | As needed |
| ☐ | Stripe live mode, Connect, 1099 settings | Week 1–3 |
| ☐ | Turn `DEMO_MODE` off | Launch day |

**How to ask:** open a GitHub issue in this repo, titled with the ask, or message Matt. Don't edit `app/` or `server/`.
