# Plowbird go-to-market gameplan (written Oct 19, 2026)

**Goal:** launch with a real driver network before the first plowable snow. In the Twin Cities that's usually mid-to-late November.

**Strategy: one pilot area, drivers first.**
- A marketplace fails if customers order and nobody comes. So recruit drivers before advertising to customers.
- Advertise only where drivers can reach a customer in about 20 minutes.
- Start in 4–6 first-ring suburbs with lots of front driveways, for example Richfield, Edina, Bloomington, St. Louis Park, Roseville and Maplewood. Pick the final list where the first drivers live.
- Many Minneapolis and St. Paul homes have alley garages and shared driveways, so the cities come second.

**Money per job** (2-car driveway, before promo):
- Customer pays $49.50 ($45 + $4.50 fee).
- Driver gets $36.
- Plowbird keeps $13.50, minus Stripe's ~$1.75 fee, so about **$11.75**.
- FIRSTPLOW costs $10 on a customer's first job. It pays for itself if they order twice or buy a Storm Pass.

---

## Phase 0: launch blockers (this week, Oct 19–25)

**Built by Claude (in the app):**

| | What | Why |
|---|---|---|
| ☐ | **Driver applications + approval.** A `/drive` page where drivers apply (truck, plow, insurance, area). They can't take jobs until approved in a new `/admin` page. | Today anyone who signs up as a driver can take jobs. |
| ☐ | **Unaccepted-order timeout.** If no driver accepts within ~10 min, the order is cancelled, the card hold released, and the customer told. | Once demo mode is off, unaccepted orders would hang with a hold on the card. |
| ☐ | **Pilot service area + waitlist.** Orders only inside the pilot ZIP codes. Everyone else joins a "storm alerts + $10 off" list. Every visitor's source (poster, card, email…) is saved. | Builds the opt-in email list. Shows which flyers work. |
| ☐ | **Terms, Privacy, Contact pages.** | Stripe requires them for live payments. Google requires a privacy page to open Google sign-in to everyone. |
| ☐ | **Outreach kit.** Researched lists of neighborhood groups, HOAs and plow and landscaping businesses, plus ready-to-post driver and customer ads. | So recruiting can start on day one. |

**Only you can do these (accounts, money, signatures):**

| | What | Notes |
|---|---|---|
| ☐ | **Form the business** | A Minnesota LLC (MN Secretary of State, online), then a free EIN from the IRS. Talk to an accountant about sales tax on snow removal. |
| ☐ | **Insurance** | A broker quote for general liability for Plowbird. Require drivers to carry commercial auto insurance with plow coverage, plus their own liability policy. The application asks for this. |
| ☐ | **Stripe live mode** | Activate the account (business details, bank, ID), then turn on **Connect → Express** for driver payouts. Then swap live keys into Render. I can open the pages for you. |
| ☐ | **Support contact** | A support email or phone (e.g. a Google Voice number) for the Contact page and the flyers. |
| ☐ | **Google sign-in** | After the Privacy page is live: Google Cloud → Audience → **Publish app**. |
| ☐ | **Admin access** | Add `ADMIN_EMAILS` (your email) on Render → plowbird-api, so only you can approve drivers. |

## Phase 1: recruit drivers (Oct 26 – Nov 8)

**Target:** 10–15 approved drivers in the pilot area, with at least 2 near each suburb.

- **Who:**
  - landscapers and lawn crews (idle in winter, often own plows)
  - solo plow operators with a few contract accounts who want to fill gaps
  - contractors with a plow-equipped pickup
- **Where:**
  - Craigslist (gigs + "skilled trade")
  - Facebook groups (Minnesota snow-removal and plow groups, local buy/sell groups)
  - plowing forums
  - farm-supply and equipment-dealer bulletin boards
  - direct calls and emails to the landscaping businesses in the outreach list
- **Pitch:**
  - "Paid driveway jobs near you, when you want them."
  - $36 for a 2-car driveway, plus 100% of tips.
  - Choose your jobs; paid through Stripe.
  - No marketing, no invoices, no chasing payment.
- **Vetting** (the `/admin` approval):
  - license and insurance
  - truck and plow photos
  - a 10-minute phone call
- **Launch-week guarantee (optional):** e.g. $X/hour minimum during the first storm while online in the pilot area. It keeps drivers online while demand ramps up.

## Phase 2: build the customer waitlist (Nov 1 – first snow)

**Target:** 300–500 opt-in signups in the pilot area before the first storm.

- **Paper:**
  - Posters with tear-off tabs at co-ops, libraries, hardware stores and coffee shops in the pilot suburbs.
  - Coupon cards on doorsteps (not in mailboxes) on long-driveway blocks.
  - `marketing/print/`.
- **Partners:**
  - email neighborhood associations and HOAs a short sponsored blurb, offering each its own code (e.g. RICHFIELD10)
  - realtors: a "first snow on us" closing gift
- **Online:**
  - Nextdoor business page plus posts in the pilot neighborhoods
  - local Facebook groups
  - a Google Business Profile (needed for "snow plowing near me" searches)
- **Message:** "Order a plow like a ride. Watch it come. Pay after it's plowed. $10 off your first plow."

## Phase 3: go live on the first 2"+ forecast

1. Set `DEMO_MODE` to `0` and confirm live Stripe keys.
2. The evening before the snow, email the waitlist using the template in `marketing/print/` and post in the neighborhood groups.
3. You (and me, here) watch the first storm live. Every order must be accepted. If one isn't, call a driver directly.
4. The morning after, ask happy customers for Google reviews and offer Storm Pass.

## Phase 4: after the first storms

- **Referrals:** "Give $10, get $10".
- **Storm Pass push in December:** auto-plow subscriptions are the steady revenue.
- **Grow outward:** expand ZIP by ZIP as drivers sign up.
- **Driver alerts by text:** SMS job alerts so drivers don't have to keep the app open. This needs a Twilio account.

## What to watch each week

- approved drivers per pilot suburb
- waitlist signups by source
- FIRSTPLOW redemptions
- in storms: order acceptance rate and time to accept
- repeat customers
- Storm Pass signups
