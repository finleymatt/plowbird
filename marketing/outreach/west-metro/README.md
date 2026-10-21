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
