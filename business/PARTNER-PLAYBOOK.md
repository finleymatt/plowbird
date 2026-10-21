# Plowbird partner playbook: business side

**Owner:** Danny (marketing, customer acquisition, hiring, financials)
**Tech owner:** Matt (app, server, payments setup, deploys)
**Written:** Oct 21, 2026
**Launch goal:** live for real orders before the first plowable snow (2"+) in the Twin Cities, usually mid-to-late November. **Treat Nov 13 as launch-ready day** so we're covered if snow comes early.

This is the list of things only a person can do: sign, pay, call, verify, decide. Claude can draft almost everything here (emails, ads, scripts, budgets, spreadsheets), but a human has to send it, sign it or pay for it. The context file for your Claude is [`CLAUDE.md`](CLAUDE.md) in this folder. A formatted copy of this plan is [`Plowbird-Partner-Playbook.docx`](Plowbird-Partner-Playbook.docx).

**Order of work: drivers and the waitlist first, paperwork before the first paid order.** Recruiting and collecting sign-ups don't take anyone's money or put a plow on a driveway, so they start now. The LLC, insurance and live payments must be done in Week 3, before any real order.

Related docs:
- [`marketing/GAMEPLAN.md`](../marketing/GAMEPLAN.md): the go-to-market plan
- [`marketing/handoff/README.md`](../marketing/handoff/README.md): marketing brief (numbers, links, brand, rules)
- [`marketing/outreach/`](../marketing/outreach/): contact lists and ready-to-post copy. West-metro lists are in `marketing/outreach/west-metro/`.

> Nothing here is legal, tax or insurance advice. Items marked ⚖️ should be confirmed with an attorney, CPA or insurance broker before you rely on them.

---

## Pilot area: west metro

Start where the drivers can be central: **Plymouth, Wayzata, Hopkins and Minnetonka**, then neighbors (Medina, Orono, Long Lake, Golden Valley, St. Louis Park, Maple Grove, Eden Prairie) as drivers sign up.

Starter ZIP list for Matt to set as `SERVICE_ZIPS` (verify each against a USPS lookup before going live): Plymouth 55441, 55442, 55446, 55447 · Wayzata 55391 · Hopkins 55343 · Minnetonka 55305, 55345. Add a ZIP only once 2+ approved drivers live within about 15 minutes of it.

Outside those ZIPs the website says **"Coming soon to <city>"** and collects a waitlist email. Watch **Admin → Waitlist → by ZIP** to decide where to expand next.

---

## 0. Decide together this week

Just the quick decisions needed to start recruiting and marketing.

| | Decision | Why |
|---|---|---|
| ☐ | **Final pilot ZIPs** (see above) | Matt sets them in the app. All flyers and posts point at them. |
| ☐ | **Support contact** (email + phone) | Goes on the Contact page, flyers and Google Business Profile. A Google Voice number works. |
| ☐ | **Starter budget** and who fronts it | Printing, Craigslist and a few boosted posts. Keep every receipt: it becomes a business expense once the LLC exists. |
| ☐ | **A one-page written handshake** ⚖️ | Who does what, how ownership will split, and that the details go into the LLC operating agreement in Week 3. Two people working on a business together are usually treated as a partnership by default, so put it in writing now. |
| ☐ | **Launch-week driver guarantee: yes/no, and the amount** | It changes the driver pitch and the budget. |

---

## 1. Week by week to launch

| Week | Dates | Focus | Goal by the end |
|---|---|---|---|
| 1 | Oct 21–27 | Drivers + waitlist start | Ads up, calls made, accounts open |
| 2 | Oct 28 – Nov 3 | Vet drivers, push the waitlist | 20+ applications, flyers out, insurance quotes in |
| 3 | Nov 4–10 | Make it official | LLC, bank, insurance, Stripe live, 10–15 approved drivers |
| 4 | Nov 11–17 | Launch-ready | Go/no-go passed, test order done |

### Week 1: Oct 21–27 (start drivers and the waitlist)

**Drivers**
1. ☐ **Post driver ads**: Craigslist gigs + skilled trades, Facebook plow and snow-removal groups, local buy/sell groups. Copy and where to post: `marketing/outreach/`. Link to **plowbird.app/apply** with a tag, e.g. `plowbird.app/apply?utm_source=craigslist&utm_campaign=gig`.
2. ☐ **Call the landscapers and plow businesses** in `marketing/outreach/west-metro/driver-leads.csv` (and the west-metro rows of `driver-leads.csv`) using `cold-email-and-phone-script.md`. Log every call (date, outcome, follow-up) in a sheet.
3. ☐ **Drop driver posters** at plow dealers, farm-supply and hardware stores (`marketing/print/plowbird-driver-poster.pdf`). Ask first.

**Waitlist**
4. ☐ **Post in Nextdoor and local Facebook groups** in the pilot cities (`customer-posts.md`). Frame it as "join the waitlist for $10 off your first plow". Follow each group's promo rules.
5. ☐ **Book newsletter and event spots.** Neighborhood, school and city newsletters often close weeks ahead. Use `marketing/outreach/west-metro/flyer-spots.csv` for events, schools, HOAs and boards with timing, and `partner-email-neighborhoods-hoas.md` for the pitch.

**Accounts you own** (create with a Plowbird email, add Matt as a second admin)
6. ☐ Support mailbox `support@plowbird.app` (forwarding is fine) and a Google Voice number.
7. ☐ **Google Business Profile**. Start now: verification can take days to weeks. Copy is in `marketing/outreach/google-business-profile.md`. Use a service-area business with no public address.
8. ☐ **Nextdoor business page**, **Facebook page**, **Instagram**, **Mailchimp** (or similar). Mailchimp needs a mailing address in every email (CAN-SPAM). A PO box or virtual mailbox works.

### Week 2: Oct 28 – Nov 3 (vet drivers, push the waitlist)

Targets: **20+ driver applications** (so 10–15 pass vetting, 2+ near each pilot city) and the **waitlist growing toward 300–500**.

**Drivers**
1. ☐ **Vet each applicant.** The `/apply` form already collects their truck, plow, area, insurance answers, license state and expiry, 21+, and a signed contractor acknowledgment. On the call, check:
   - a 10-minute conversation
   - the driver's license
   - insurance declarations (commercial auto with plow coverage, and general liability)
   - a photo of the truck with the plow on

   Keep copies in a private, access-limited folder, never in GitHub.
2. ☐ **Approve drivers at plowbird.app/admin → Drivers** (Matt adds your email to `ADMIN_EMAILS` first).
3. ☐ **Keep recruiting** until every pilot city has 2+ drivers.

**Waitlist**
4. ☐ **Print** customer posters and coupon cards (`marketing/print/`). Test-scan every QR from 2 ft on an iPhone and an Android before a full run.
5. ☐ **Post posters** at libraries, rec centers, coffee shops and hardware stores in the pilot cities (`flyer-spots.csv`). Ask first.
6. ☐ **Door-drop coupon cards** on long-driveway blocks: doors and porches only, never in mailboxes, and only where the city allows it.
7. ☐ **Realtors and property managers**: offer a "first snow is on us" closing gift. Agree on the budget first.

**Start the paperwork**
8. ☐ **Insurance quotes** ⚖️ from an independent commercial broker (not a single-carrier agent). Ask for:
   - general liability for Plowbird as a marketplace
   - hired and non-owned auto
   - whether you need an umbrella
   - what minimum coverage to require from drivers (e.g. $1M general liability, commercial auto with plow endorsement) and whether drivers should name Plowbird as an additional insured
9. ☐ **Book the attorney** for Week 3 (operating agreement + driver terms review).

### Week 3: Nov 4–10 (make it official: all of this before the first paid order)

**Legal**
1. ☐ **Form the Minnesota LLC** online at the MN Secretary of State (sos.state.mn.us → Business & Liens → Start a business). Same-day online. Check the current filing fee there.
2. ☐ **Operating agreement** ⚖️: turn the Week 1 handshake into the real thing (ownership, roles, vesting, spending limits).
3. ☐ **Get an EIN** free at irs.gov (about 10 minutes). Never pay a third-party site for this.
4. ☐ **Driver contractor terms** ⚖️: have the attorney review `/terms` section 3 and the acknowledgments on `/apply`. Drivers are independent contractors: don't set their hours, require exclusivity, or direct how they do the work.
5. ☐ **Sales tax** ⚖️: ask the CPA whether residential snow plowing is taxable in Minnesota, whether Storm Pass is treated differently, and whether you need a MN tax ID.
6. ☐ **City license check**: ask each pilot city whether a marketplace like ours needs a business license.

**Money and insurance**
7. ☐ **Business bank account** in the LLC's name (needs the EIN and Articles of Organization).
8. ☐ **Bookkeeping**: QuickBooks Online, Wave or similar, connected to the bank and Stripe. Log the receipts from Weeks 1–2.
9. ☐ **Bind the insurance** (a policy in hand, not a quote). Send Matt the driver minimums so `/apply` and the Terms match.
10. ☐ **Hand Matt the Stripe live-mode details**: legal name, EIN, business address, bank account and owner identity info. Matt turns on live payments.

**Get ready to sell**
11. ☐ **Prep the launch email** in Mailchimp (`marketing/print/plowbird-email.zip`) and a "snow emergency tonight" post.
12. ☐ **Driver kickoff call**: walk every approved driver through the app, payouts (Stripe Express setup on the Earnings tab), and what to do on a storm night. Make sure each one has finished payout setup.

### Week 4: Nov 11–17 (launch readiness)

1. ☐ **Go / no-go check** with Matt (§3).
2. ☐ **Dry run**: place a real paid order in a pilot ZIP. A real driver takes it, payment captures, the driver payout shows. Refund it afterward if you want.
3. ☐ **Storm-night roster**: which drivers commit to being online for the first storm, by city. Have their phone numbers.
4. ☐ **Watch the forecast** (weather.gov/mpx). When 2"+ is forecast, run the storm playbook (§4).

---

## 2. Ongoing responsibilities after launch

Check **plowbird.app/admin → Dashboard** weekly. It covers demand, reliability, supply, money and retention for the last 7, 30 or 90 days.

### Marketing and acquisition
- **Weekly:** check the waitlist by source and by ZIP. Move budget toward what works. Expand to the ZIPs with the longest waitlist once drivers are there.
- **After every storm:** ask happy customers for Google reviews within 24 hours.
- **December:** Storm Pass push (snowbirds, older homeowners, adult children of older homeowners).
- **Referral program** ("give $10, get $10"): decide the budget, then ask Matt to build it.

### Hiring
- **Drivers** are contractors, recruited continuously. Target 2+ per pilot city before expanding to new ZIPs.
- **Employees** (e.g. a storm-night dispatcher, part-time support): before the first W-2 hire you need MN unemployment insurance registration, Minnesota workers' compensation coverage, payroll (Gusto or similar), and an I-9/W-4 process. ⚖️ Talk to the CPA first. A 1099 contractor works for short gigs, but not for someone you schedule and direct like an employee.

### Financials
- **Weekly**: reconcile Stripe payouts against the bank. Track revenue, driver payouts, Stripe fees, promo cost and ad spend. The dashboard's Money row is the starting point.
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
| ☐ | `DEMO_MODE` off, `SERVICE_ZIPS` and `SERVICE_AREA_LABEL` set | Matt |
| ☐ | Terms and Privacy reviewed by the attorney, draft notices removed, legal entity and mailing address filled in | Danny (review), Matt (code) |
| ☐ | Support email and phone answered | Danny |
| ☐ | 10+ approved drivers with payouts set up, 2+ per pilot city | Danny |
| ☐ | Dry-run order completed end to end | Both |
| ☐ | Storm-night roster and on-call plan | Danny |

---

## 4. Storm-night playbook

**Evening before (2"+ forecast):**
1. Text every approved driver: storm timing, ask who's going online.
2. Around 7 pm, send the waitlist email and post in neighborhood groups.
3. If a snow emergency is declared, post the "snow emergency tonight" version.

**During the storm:**
1. Watch orders live (`/admin`). Every order has to be accepted. Orders auto-cancel and release the card hold after 10 minutes with no driver.
2. If orders are waiting, call drivers directly.
3. Answer support messages fast. Note every problem for the post-storm review.

**Morning after:**
1. Ask for Google reviews.
2. Pay any launch guarantee promised to drivers.
3. Post-storm review with Matt using the dashboard's Reliability row: fill rate, time to accept, timed-out orders, complaints, what broke.

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
| ☐ | Add Danny's email to `ADMIN_EMAILS` (dashboard, waitlist, driver approvals) | Week 1 |
| ☐ | Set `SERVICE_ZIPS` and `SERVICE_AREA_LABEL` for the pilot | Week 1 |
| ☐ | Update the Contact page with the support email/phone | Week 1–2 |
| ☐ | Fill in the broker's insurance minimums, legal entity name and address in the Terms | Week 3 |
| ☐ | Add per-partner promo codes (e.g. `WAYZATA10`) before any partner publishes one | As needed |
| ☐ | Stripe live mode, Connect, 1099 settings | Week 3 |
| ☐ | Turn `DEMO_MODE` off | Launch day |

**How to ask:** open a GitHub issue in this repo, titled with the ask, or message Matt. Don't edit `app/` or `server/`.
