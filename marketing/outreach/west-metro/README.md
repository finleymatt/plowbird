# West metro outreach lists (Plymouth / Wayzata / Hopkins / Minnetonka pilot)

Built Oct 21, 2026 for the November launch. Nothing here has been contacted, posted or paid for.

## Files

| File | Rows | What's in it |
|---|---|---|
| `driver-leads.csv` | **41** | Businesses and operators that plow or could plow in the west metro: 32 lawn/landscape companies, 5 snow-only businesses, 2 contractors with plow trucks (tree service, towing), 1 Craigslist operator ad, 1 Thumbtack pro. 28 say they do residential plowing; 13 are `unknown`. 40 have a phone and 20 have an email. 6 are also in the main `../driver-leads.csv` (Freshwater, Lawnsmith, KG, Peter Doran, New Finish, FJ) and are marked "Also in main list". |
| `flyer-spots.csv` | **74** | 15 events, 13 Hennepin County Library branches, 7 rec centers, 8 business boards (hardware, co-op, coffee, lumber), 6 HOAs/managers, 4 Hopkins neighborhood associations, 7 school-district channels, 6 chambers, 3 city newsletters, 3 paid local media (`other`), 1 church, and 1 arts center. |

## Key dates, Nov 1 to Dec 31, 2026 (checked)

- **Nov 12, 24, Dec 10, 22**: Maple Grove winter indoor markets (Community Center, 3-6 pm)
- **Nov 13-15** (and Dec 11-13): Holiday Craft & Gift Show, Eden Prairie Center (paid booth)
- **Nov 20**: Wayzata Light Up the Lake. This date comes from a secondary listing. In 2025 it was Nov 21.
- **Nov 28**: Small Business Saturday on Mainstreet Hopkins. The Excelsior "Celebrating the Season" series also starts that day.
- **Dec 5**: Holiday in Hopkins (2-4:45 pm) and the Plymouth Merry Market (10-2). Excelsior's tree lighting is probably Dec 5 too.
- **Dec 9**: deadline to commit to an ad in the Minnetonka Community Education catalog (Summer 2027 issue)
- **Dec 12**: Minnetonka Winter Farmers Market
- **Feb 6, 2027**: Wayzata Chilly Open (Wayzata West Metro Chamber). Tickets go on sale Dec 1.
- **No 2026 date yet**: Plymouth Old Fashioned Christmas, Minnetonka Light up the Commons, Long Lake and Orono tree lightings, and Arbor Lakes Santa. Each row's notes give the prior year's date.

## Findings that change the plan

- **School flyers are mostly closed to a for-profit service.** Osseo bans for-profits outright (Procedure 923). Minnetonka, Eden Prairie and Robbinsdale use Peachjar with policies that favor nonprofit youth activities. The paid route is the **Minnetonka Community Education catalog**: $300 for a quarter page, sent to 42,000+ homes. The winter issue has closed; ask about late placement.
- **City newsletters don't take ads.** The Minnetonka Memo says so explicitly. We found no ad policy for Plymouth News or Golden Valley CityNews. Paid local options are the Sun Sailor, Plymouth Magazine and Lake Minnetonka Magazine.
- **There is no Plymouth chamber.** TwinWest merged into the Minneapolis Regional Chamber in 2020. The **Wayzata West Metro Chamber** now covers Plymouth, Hopkins, Minnetonka, Medina, Orono, Long Lake and Corcoran, so it is the one to join.
- **Competitors for customers and drivers**: DZ Lawn Care runs its own on-demand snow app in Plymouth. Sandoval Services (Golden Valley) is hiring plow drivers. Plowz & Mowz and LawnGuru (marketplaces) show up for every pilot city. KG Landscape dominates search results in every city.
- **"Hopkins Holiday Market" is in South Carolina.** It came up in searches and is excluded.

## Gaps

- **Most pages could not be opened directly.** This session's web-fetch tool and network were blocked, so each row was checked against search-engine extracts of the cited page, not the live page. Phones and emails were kept only when an extract tied them to the business's own site or listing. Spot-check before calling. Where sources disagreed, the notes give both values.
- **There are few individual-operator ads.** Only one Craigslist plow ad could be confirmed with its post URL and contact (LL Contracting, posted March 2026). An older "$30 western suburbs" ad (post 7808942948) is excluded because its contact couldn't be confirmed. Plow ads usually appear after the first snow, so search Craigslist "services" again in mid-November. Facebook, Nextdoor posts and anything behind a login were not collected.
- **Bulletin boards are not confirmed** at any hardware store, coffee shop, co-op, rec center or church. These rows are "ask the desk" leads.
- **HOAs**: 3 Plymouth HOA websites were found, but their housing type (single-family or townhome) wasn't confirmed. Seven Ponds may be inactive. Board members' personal contacts were not collected.
- **Not covered**: neighborhood associations outside Hopkins (St. Louis Park's are in the main `neighborhood-orgs.csv`), and holiday events in St. Louis Park, Golden Valley, Eden Prairie (city events), New Hope, Crystal, Medina and Corcoran (no 2026 listings found). The Plymouth Ice Center, Brookview (Golden Valley) and Wayzata/Orono/Westonka schools' flyer policies were not checked.

## How it was built

- Searches by city and by trade ("lawn and snow", "snow plowing", Craigslist, Thumbtack), plus targeted lookups for each business, event, library, district policy and chamber.
- Leads in the main `../driver-leads.csv` were skipped unless they serve the west metro.
- **Privacy**: only contact details a business or organization published to advertise itself or reach the public. That means no personal social profiles, no home addresses and no private posts. Where a page listed a staff member's personal-looking email, the general line was used instead.

## Commercial prospects (`commercial-prospects.csv`)

Built Oct 21, 2026. **70 small-lot commercial prospects**, none contacted.

- **By city**: Hopkins 13, Minnetonka 12, Plymouth 11, Wayzata 10, Long Lake 6, Golden Valley 5, Medina 4, Maple Grove 3, Orono 2, St. Louis Park 2, Eden Prairie 2. The four pilot cities have 46 rows.
- **By category**: dental/medical/chiro/vet 20, daycare/preschool 13, church 12, auto 8, restaurant 6, other (funeral homes, dance studio) 4, apartment 4, office 2, strip center 1.
- **Contact coverage**: 49 rows have a phone and only 1 has an email. Most businesses publish a web form, not an address.

**How it was built.** Searches by city and category (dentist, vet, chiro, daycare/Montessori, church, auto repair, funeral home, cafe, apartments/property managers, strip centers, CPA/law), then follow-up lookups for addresses and phones. Sources are directories (City of Hopkins faith page, Wayzata chamber, MNCPA, AMI, LCMS/UMC locators, CareLuLu, childcarecenter.us, PetsBest, WebMD, Checkbook, AAA). **Web fetch was blocked in this session**, so every row was checked against search-engine extracts of the cited page, not the live page. Phones come from directory listings and were not always seen on the business's own site. Where sources disagreed, the notes give both values.

**Left out on purpose**: chains and corporate operators (Banfield, KinderCare, HealthPartners, Midas/Jiffy Lube), large grocery-anchored centers (Colonial Square, Glen Lake Village, Shops of Plymouth Town Center, Waterford Park), large churches (Wayzata Community Church), and big apartment complexes.

**Caveats**
- `est_lot_size` is mostly `unknown`. "Small" and "medium" come only from listing details (licensed capacity, unit count, square feet, "seats 40"). Check satellite view before quoting.
- **Many medical and office prospects are tenants** (rows with a suite number). The landlord usually holds the snow contract. Use the tenant as a way in and ask who manages the lot. Rows where this applies say so.
- Strip centers and apartments are thin: only 1 strip center and 4 apartment rows. Listing sites name brokers, not property managers. For better leads, use Hennepin County property records or the cities' rental-license lists to find owners and managers of 8–40 unit buildings.
- Several "Hopkins" and "Wayzata" mailing addresses are physically in Minnetonka or Orono. The notes flag the ones we noticed.
- Broker and staff names from listings were not copied. Decision-maker hints are roles only.

**How to pitch small commercial lots**
- **Price per push, with a clear trigger** (e.g. 2" or more), and say up front what a typical season costs. Small offices and churches don't want a seasonal contract sized for a big lot. Offer a monthly cap or seasonal option for those who budget.
- **Guarantee a time the lot is clear.** Daycares (many open at 6:30 am), clinics, vets (7:30 am), cafes and auto shops all need the lot open *before* opening. Churches need Sunday morning, plus any midweek programs (e.g. Gethsemane's Wednesday meal). Funeral homes need on-call service. Promise a clear-by time and send a photo when the push is done.
- **Have insurance documents ready.** Expect requests for a **certificate of insurance** (general liability, often $1M/$2M), naming the property owner or manager as **additional insured**, plus proof of auto liability for the truck. Property managers may also ask for a W-9, a signed service agreement, and hold-harmless language. Sort out whether Plowbird's policy or each driver's covers this before the first call.
- **Salting and ice control.** Commercial customers, especially medical offices, daycares and anything with slip-and-fall exposure, will ask about salt and sand. Plowbird doesn't offer it yet. Say so plainly, suggest they keep their current salting arrangement or do it themselves, and make sure the agreement says plowing only. A salting partner or add-on is probably needed to win many of these.
- **Cluster routes.** Next-door neighbors make efficient routes: Long Lake Dental, Lakeside Family Dentistry and Long Lake Vet sit at 1854–1880 W Wayzata Blvd, and the Hopkins churches are close together.
