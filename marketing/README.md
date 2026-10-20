# Plowbird launch marketing (Twin Cities)

| File | What it is |
|---|---|
| `print/plowbird-poster.pdf` | 8.5×11 poster with a $10-off coupon and 7 tear-off tabs (cut on the dashed lines). |
| `print/plowbird-coupon-cards.pdf` | Four 4.25×5.5 handout cards per sheet. Print on card stock (80–110 lb) and cut. |
| `print/plowbird-email.zip` | The email, ready to import into Mailchimp (*Templates → Import template → zip*). |
| `email/email.html` | The same email as plain HTML, for other email tools (upload `images/hero.png` with it). |
| `preview/*.png` | Pictures of all three. |
| `build.py` | Rebuilds everything. Change the offer code or links there (`pip install segno`, then `python build.py`). |

Each QR code goes to `plowbird.app/?promo=FIRSTPLOW&utm_source=…` (`poster`, `tab`, `card`), and email links use `utm_source=email`. That way you can tell which piece of paper each visit came from.

## Before anything goes out

1. **Make the code work.** The app doesn't accept promo codes yet, so FIRSTPLOW must be built into checkout before you print. The QR links already carry `?promo=FIRSTPLOW`, so checkout can apply it automatically.
2. **Turn off demo mode.** `DEMO_MODE=1` (Render → plowbird-api → Environment) makes the demo driver take every order, and card-less orders are free. Set it to `0` once real drivers are signed up.
3. **Switch Stripe to live keys.** Test keys never charge real cards. Live keys mean finishing Stripe's business verification and turning on Connect so drivers get paid.
4. **Line up drivers first.** A flyer that brings in orders nobody accepts burns the customer. Recruit a few plow operators before the first push (ideas below).
5. **Test-print one sheet.** Scan every QR code from about 2 feet away with an iPhone and an Android phone.

## Email: who to send to (and who not to)

**Don't buy a list of homeowner emails.** Mailchimp and every reputable email tool ban purchased lists and will suspend the account. Bought addresses also land in spam and hurt every later send. US law (CAN-SPAM) also requires an unsubscribe link and your mailing address in every email; the template already has both.

**Build an opt-in list instead:**
- **Neighborhood groups:** Minneapolis has about 70 neighborhood organizations and St. Paul has 17 district councils, and many run email newsletters. Offer a short sponsored blurb, or a neighborhood-only code such as LINDENHILLS10.
- **HOAs and townhome associations** in the suburbs (Woodbury, Maple Grove, Eden Prairie, Plymouth, Lakeville, Blaine). Boards like a group deal: "every unit gets $10 off". Storm Pass could also be sold as one contract for a whole association.
- **Realtors and property managers:** a "first snow is on us" closing gift for new homeowners, or a perk for rental owners who must keep walks clear.
- **Your own signup:** a "Get storm alerts + $10 off" box on plowbird.app. The app already tracks NWS forecasts, so the alert gives people a reason to subscribe.

**Timing:** send 1–2 days before the first forecast of 2"+ snow, around 7 pm, when people check the forecast. Send a reminder the morning it starts.

**Subject lines to A/B test** (also in the template's comments):
- Snowed in? Your driveway, plowed in minutes ❄️
- $10 off your first plow this winter
- Skip the shovel: order a plow like you order a ride

## Flyers: where they work

- **Bulletin boards (poster with tear-off tabs):** co-ops (Seward, Wedge, Lakewinds, Mississippi Market), libraries, coffee shops, laundromats, community centers, church lobbies, hardware stores (Ace, Frattallone's, Hirshfield's). Ask before posting, and top up the tabs every week or two.
- **Counters (coupon cards):** hardware-store and coffee-shop registers, realtor open houses, apartment and townhome mailrooms (ask management).
- **Door drops:** hand out cards on blocks with long driveways and corner lots. Keep a few rules in mind:
  - Never put flyers *in* mailboxes: federal law bans non-postage items there. The door or porch is fine.
  - Some suburbs require a solicitor or peddler permit even for flyer drops, so check the city's rules first.
  - Don't staple to utility poles. Most cities ban it, and Minneapolis removes and can fine.
- **Mail to every house on a route:** USPS Every Door Direct Mail (EDDM) reaches every address on chosen carrier routes, with no list needed. You can pick routes with mostly single-family homes. EDDM requires a large "flat" piece such as a 6.25×11 jumbo postcard, not these cards. Check usps.com/eddm for current postage. A jumbo-postcard version is easy to add.

## Hooks that fit the Twin Cities

- **Snow emergencies:** Minneapolis and St. Paul tow cars off the street during snow emergencies. Pitch: "Snow emergency tonight? Clear your driveway so your car isn't on the street." Post in neighborhood Facebook groups and on Nextdoor the evening one is declared.
- **The first big storm:** in neighborhood groups, the morning after is when people ask "who plows driveways?". Have a short post ready to answer with: link, code, "pay after it's plowed".
- **Storm Pass for people who are away:** snowbirds, travelers and older homeowners. A good message for senior centers and adult children ("make sure Mom's driveway is clear").

## Drivers (the other side)

Recruit before the customer push:
- landscaping companies that are idle in winter
- people with a plow-equipped truck on Facebook Marketplace and Craigslist
- farm and ranch supply bulletin boards

Pitch: "Fill gaps between your contract routes with paid jobs near you, and keep your share plus 100% of tips." A driver version of the poster can be made from `poster.html`.

## Measuring it

- Count FIRSTPLOW redemptions, and check visits by `utm_source` (poster, tab, card, email).
- If a channel works, give it its own code (e.g., a code per neighborhood) so redemptions show which neighborhood or partner sent them.
