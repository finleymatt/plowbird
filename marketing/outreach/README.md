# Outreach kit: Twin Cities pilot

Lists and ready-to-post copy for **Phase 1 (recruit drivers)** and **Phase 2 (customer waitlist)** in `../GAMEPLAN.md`. Nothing here has been posted, sent or signed up for. Do all of that yourself.

## Contact lists

| File | What's in it |
|---|---|
| `neighborhood-orgs.csv` | **126 organizations:** all 66 Minneapolis neighborhood organizations, all 17 St. Paul district councils, Edina's 14 recognized neighborhood associations, St. Louis Park's 23 listed neighborhoods, and 6 community groups and chambers in Richfield, Bloomington and Roseville. 72 have a newsletter. 6 publish sponsor or ad info (Powderhorn Park, Nokomis East, Highland District Council, Richfield Chamber, Twin Cities North Chamber, Bloomington Crime Prevention Assn.). |
| `hoas.csv` | 10 HOA management companies that serve the pilot suburbs, 3 named associations, and the state HOA trade group. |
| `driver-leads.csv` | **31 lawn, landscaping and snow businesses**, 25 of them listing at least one pilot suburb in their service area, each with a phone, email or contact form from its own website and a note on whether it advertises residential plowing. |
| `places-to-post.md` | Craigslist sections (with fees), Facebook search terms, Nextdoor, plow forums, plow dealers' counters, and poster spots with addresses in each pilot suburb. |

**How the lists were built:**
- Only public, organizational contacts are included.
- Where a city lists a volunteer's personal email (most Edina and St. Louis Park associations), the CSV has the association's own inbox, Facebook page or the city's contact instead. The `source_url` column says where each row came from.
- The `newsletter` and `sponsorship_or_ads` columns come from an automated read of each homepage on Oct 19, 2026. "not listed" means it wasn't on the homepage, not that they don't have one. Ask.

**Gaps you should know about:**
- **Richfield, Bloomington, Roseville and Maplewood have no city-recognized neighborhood associations.** Searches and the cities' own sites turned up none. In those suburbs, reach people through Facebook groups, Nextdoor, chambers, libraries and paper. Bloomington's 2025 HOA study (bloomingtonmn.gov) maps its HOAs but doesn't name them.
- **HOAs don't publish board contacts.** The way in is the management company. One email to FirstService, AssociationOne or New Concepts reaches dozens of boards. You can also find a specific association's name and manager in Hennepin/Ramsey County property records.
- **Most townhome and condo HOAs already contract plowing for the whole property**, so their residents rarely need a driveway plow. Single-family HOAs and neighborhoods are the customer target. Townhome HOAs fit better as a newsletter blurb, a Storm Pass "group deal", or a backup vendor when their contractor is overloaded.
- **Facebook groups aren't listed by name.** Logged-out searches don't show them, so `places-to-post.md` gives search terms. The St. Louis Park neighborhood Facebook pages in the CSV are verified (they come from the city's site).
- Some contact details conflict between sources (noted in the rows). Check before calling.

## Ready-to-post copy

| File | For |
|---|---|
| `craigslist-gig-ad.md` | Drivers: short Craigslist labor-gig ad |
| `craigslist-skilled-trade-ad.md` | Drivers: longer Craigslist skilled-trades ad |
| `facebook-driver-post.md` | Drivers: Facebook group post plus a short comment reply |
| `cold-email-and-phone-script.md` | Drivers: email and phone script for the businesses in `driver-leads.csv` |
| `customer-posts.md` | Customers: Nextdoor and local Facebook posts (normal week and "snow emergency tonight") |
| `partner-email-neighborhoods-hoas.md` | Neighborhood associations, HOAs and managers: sponsored newsletter blurb plus a per-neighborhood promo code |
| `google-business-profile.md` | Google Business Profile description, categories and service area |

The driver poster is `../driver-poster.html`, printed as `../print/plowbird-driver-poster.pdf`.

## Check before you post

- **plowbird.app/drive must be live.** Every driver ad points there, and it's being built in parallel.
- **Per-neighborhood promo codes** (e.g. `FERNHILL10`) don't exist yet. Only FIRSTPLOW works. Add codes to the promo system before an association publishes one, or use FIRSTPLOW plus a `utm_source` link (shown in the partner email).
- **Driver pay ($36 for a 2-car driveway plus 100% of tips)** and **customer prices (from $35, Storm Pass from $79/mo)** come from the gameplan. If pricing changes, search this folder for `$36`, `$35` and `$79`.
- **Insurance wording:** the ads say drivers must carry commercial auto insurance with plow coverage, plus liability. Ask your broker whether Plowbird should also require a minimum limit (e.g. $1M general liability). If so, add it to the ads and the `/drive` form.
