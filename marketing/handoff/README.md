# Plowbird marketing handoff

Welcome aboard. This is everything you need to run Plowbird's launch marketing in the Twin Cities. Read this page first, then give `CLAUDE.md` (in this folder) to your Claude so it has the same context.

## What Plowbird is

On-demand driveway plowing, like DoorDash for plow trucks. A customer opens **plowbird.app**, sees an upfront price, orders a plow now or schedules one, watches the truck on a live map, and pays only after the driveway is clear. Local plow operators pick up the jobs and keep 80% plus 100% of tips.

- **Website + app:** https://plowbird.app (the same code runs the iPhone and Android apps)
- **Driver sign-up:** https://plowbird.app/drive
- **Storm Pass:** https://plowbird.app/storm-pass (monthly auto-plow subscription)

## The numbers you'll use in copy

| | |
|---|---|
| Customer price | from **$35** (1-car). A 2-car driveway is $49.50 ($45 + $4.50 fee). Prices go up during NWS storm warnings. |
| Launch offer | **FIRSTPLOW**: $10 off the first plow. New customers only, one per household, good through **March 31, 2027**. |
| Storm Pass | **$79 / $99 / $129 per month** (1-car / 2-car / 3+ car), +$15 for sidewalks. Plows automatically when 2"+ is forecast or an NWS winter warning is issued. |
| Driver pay | **$36** for a 2-car driveway + **100% of tips**, paid through Stripe. |
| Selling points | Upfront price · live map of your driver · pay after it's plowed · in-app chat (no phone numbers shared) · schedule ahead or auto-plow on storms |

If any of these change, search the `marketing/` folder for `$36`, `$35` and `$79` and update every piece.

## Strategy in one paragraph

**Drivers first, one pilot area.** A flyer that brings in orders nobody accepts burns the customer, so recruit 10–15 approved drivers before pushing to customers. The pilot is a few first-ring suburbs with front driveways (Richfield, Edina, Bloomington, St. Louis Park, Roseville, Maplewood), finalized around where drivers live. Goal: 300–500 waitlist signups before the first 2"+ snow (usually mid-to-late November). Full plan: `marketing/GAMEPLAN.md`.

## Timeline

| When | Focus | Target |
|---|---|---|
| Now – Nov 8 | Recruit drivers (Craigslist, Facebook plow groups, landscapers, plow dealers, farm supply) | 10–15 approved drivers, 2+ per suburb |
| Nov 1 – first snow | Build the customer waitlist (posters, door cards, neighborhood newsletters, HOAs, Nextdoor, Google Business Profile) | 300–500 signups |
| First 2"+ forecast | Email the waitlist ~7 pm the evening before; post in neighborhood groups; reminder the morning of | Every order accepted |
| After first storms | Google reviews, referrals, Storm Pass push in December | Repeat customers, subscriptions |

## What's already made

### Print (ready to print)
| File | What it is |
|---|---|
| `marketing/print/plowbird-poster.pdf` | 8.5×11 customer poster, $10-off coupon, 7 tear-off tabs |
| `marketing/print/plowbird-coupon-cards.pdf` | 4 handout cards per sheet. Print on 80–110 lb card stock and cut. |
| `marketing/print/plowbird-driver-poster.pdf` | 8.5×11 driver recruiting poster ($36 + tips), 7 tear-off tabs |
| `marketing/preview/*.png` | Pictures of each piece |

### Email
| File | What it is |
|---|---|
| `marketing/print/plowbird-email.zip` | Mailchimp import (*Templates → Import template → zip*) |
| `marketing/email/email.html` + `images/hero.png` | Same email as plain HTML for other tools |

Subject lines to A/B test: "Snowed in? Your driveway, plowed in minutes ❄️", "$10 off your first plow this winter", "Skip the shovel: order a plow like you order a ride".

### Outreach kit (`marketing/outreach/`)
| File | For |
|---|---|
| `neighborhood-orgs.csv` | 126 neighborhood orgs and councils (Mpls, St. Paul, Edina, SLP, Richfield/Bloomington/Roseville groups). 72 have newsletters. |
| `hoas.csv` | HOA management companies serving the pilot suburbs |
| `driver-leads.csv` | 31 lawn/landscaping/snow businesses to recruit as drivers |
| `places-to-post.md` | Craigslist sections, Facebook search terms, Nextdoor, plow forums, poster spots by suburb |
| `craigslist-gig-ad.md`, `craigslist-skilled-trade-ad.md`, `facebook-driver-post.md` | Driver ads |
| `cold-email-and-phone-script.md` | Script for calling/emailing `driver-leads.csv` |
| `customer-posts.md` | Nextdoor and Facebook posts, including a "snow emergency tonight" version |
| `partner-email-neighborhoods-hoas.md` | Sponsored newsletter blurb for associations and HOAs |
| `google-business-profile.md` | Google Business Profile description, categories, service area |

## QR codes and tracking links

Every QR code and link carries a `utm_source`, and the site saves it at sign-up, so we can see which piece of paper or post each customer came from.

| Piece | Link |
|---|---|
| Poster (big code) | `https://plowbird.app/?promo=FIRSTPLOW&utm_source=poster` |
| Poster tear-off tabs | `https://plowbird.app/?promo=FIRSTPLOW&utm_source=tab` |
| Coupon cards | `https://plowbird.app/?promo=FIRSTPLOW&utm_source=card` |
| Email | `utm_source=email` |
| Driver poster | `https://plowbird.app/drive?utm_source=driver-poster` |

**For anything new you post, tag the link the same way**, for example:
`https://plowbird.app/?utm_source=nextdoor&utm_campaign=richfield&promo=FIRSTPLOW`
`https://plowbird.app/drive?utm_source=craigslist&utm_campaign=gig`

Keep `utm_source` short and lowercase (`nextdoor`, `facebook`, `craigslist`, `hoa-firstservice`, `realtor`). Sign-up and waitlist counts per source can be pulled from the admin reports, so ask for a report whenever you want one.

To change a QR link or the offer, edit `marketing/build.py` and rebuild (`pip install segno`, then `python marketing/build.py`). Printed codes can't change, so make a new code instead of reusing an old `utm_source`.

## Brand

- **Colors:** navy `#0B1B2E` (text), plow-beacon orange `#FF5A1F` (the one main action), accent blue `#1E6FD9`, ice `#E8F2FC`, sky `#CFE4FA`, white backgrounds.
- **Font:** Inter.
- **Voice:** short, plain, neighborly. Lead with the benefit ("Your driveway, plowed in minutes"), then the proof (live map, pay after). No hype words.
- **Core line:** "Order a plow like a ride. Watch it come. Pay after it's plowed. $10 off your first plow."
- **Source art:** `marketing/assets/snow-scene.svg`, `marketing/assets/hero.html`, and the HTML sources `marketing/poster.html`, `cards.html`, `driver-poster.html`.

## Rules (please don't skip these)

- **Never buy email lists.** Mailchimp will suspend the account and CAN-SPAM applies. Opt-in only: our signup form, neighborhood newsletters, HOA partners.
- **Never put flyers in mailboxes** (federal law). Doors and porches are fine. Some suburbs need a solicitor permit even for flyer drops, so check the city first.
- **Don't staple flyers to utility poles.** Ask before posting on any bulletin board, and top up the tear-off tabs every week or two.
- **Only FIRSTPLOW works today.** Per-neighborhood codes (e.g. `RICHFIELD10`) have to be added in the app first. Ask before promising one to a partner.
- **Don't push customers outside the pilot ZIPs.** People outside the pilot area get a waitlist, not a plow. That's fine for "storm alerts" posts, but don't promise service there.
- **Driver insurance wording:** ads say drivers need commercial auto insurance with plow coverage plus liability. Don't soften it.
- **Check with me before anything goes out** that spends money (ads, EDDM postage, printing runs) or makes a commitment for Plowbird (partner deals, guarantees).

## Ask me about

- Whether the app is live for real orders yet (demo mode off, live payments on) and the final pilot ZIP list
- The support email/phone to put on new pieces
- New promo codes, or a sign-ups-by-source report
- Budget for printing, Craigslist fees, Nextdoor or Facebook ads, EDDM

## Using Claude on this

Point your Claude at this repository (you'll get GitHub collaborator access) or just drop this folder in. `CLAUDE.md` tells it the facts, rules and file layout so you can ask things like "write a Nextdoor post for Edina for the snow emergency tonight" or "make a jumbo EDDM postcard version of the poster".
