# Partner email: neighborhood associations, HOAs and management companies

**Who:** rows in `neighborhood-orgs.csv` that have a newsletter, start with the pilot suburbs, plus the management companies in `hoas.csv`. Groups with a published sponsor page (Powderhorn Park, Nokomis East, Highland, Richfield Chamber, Twin Cities North Chamber, Bloomington Crime Prevention Assn.) already sell placements, so follow their process and rates.

**What you offer:**
1. A ready-to-paste newsletter blurb (below)
2. A neighborhood-only code worth more than the public one
3. Optionally, a sponsorship fee or a per-signup donation to the association

---

## The per-neighborhood code idea

- Give each association its own code, e.g. **`FERNHILL15`** (Fern Hill, St. Louis Park) or **`MORNINGSIDE15`** (Morningside, Edina).
- Make it **$15 off the first plow** instead of FIRSTPLOW's $10, so the association can tell members they got a better deal.
- Each code shows exactly how many households that newsletter brought in. Report the number back to the board. It makes them want to run it again.
- **Optional kicker:** donate **$5 per first plow** on their code to the association's fund (block parties, park cleanups). Many neighborhood groups are nonprofits that fundraise, so this is an easy yes. Put a cap on it, e.g. $250 per association per season.
- Naming pattern: `NEIGHBORHOOD` + amount, uppercase, no spaces, under 15 characters.

> **Build first:** only FIRSTPLOW exists in the app today. Add each code to the promo system before the newsletter goes out, and set the same rules as FIRSTPLOW: new customers, one per household, expires March 31, 2027. Until then, send the FIRSTPLOW link with a `utm_source` per neighborhood: `plowbird.app/?promo=FIRSTPLOW&utm_source=fernhill`.

---

## Email to a neighborhood association

**Subject options:**
- Newsletter item for [Neighborhood]: neighbors-only plow discount
- A winter perk for [Neighborhood] residents
- Sponsoring [Neighborhood]'s winter newsletter?

**Body:**

> Hi [Neighborhood] board / newsletter team,
>
> I'm [Your name], founder of **Plowbird**, a new Twin Cities service where residents order a local plow truck to their driveway from their phone. We're launching in [City] this winter.
>
> I'd love to offer [Neighborhood] residents a neighbors-only perk: **$15 off their first plow with code [CODE]**. That's more than our public offer. I've written a short blurb below that you can paste into your next newsletter, website or Facebook page, edited however you like.
>
> [If they have a sponsor page:] I saw you offer newsletter sponsorships. I'm happy to do this as a paid placement. Could you send me your current rates and deadlines?
>
> [If not:] As a thank-you, Plowbird will donate $5 to [Neighborhood] for every household that books its first plow with the code this season (up to $250).
>
> A little about how it works: residents see an upfront price (from $35), watch their driver arrive on a live map, and pay only after the driveway is plowed. All drivers are local plow operators, and we check their insurance before they can take jobs.
>
> Would this fit your [December / next] issue? Happy to answer any questions.
>
> Thanks,
> [Your name]
> Plowbird · plowbird.app · [phone]
> [Business mailing address]

### Newsletter blurb (about 70 words, paste-ready)

> **Neighbors-only: $15 off driveway plowing this winter** ❄️
> Plowbird, a new local service, brings a plow truck to your driveway on demand. Order from your phone, see your price upfront (from $35), watch your driver arrive on a live map, and pay only after it's plowed. [Neighborhood] residents get **$15 off their first plow with code [CODE]** at plowbird.app. Want it automatic? Storm Pass plows whenever 2"+ is forecast, from $79/month.

### Even shorter (Facebook page / website sidebar)

> ❄️ [Neighborhood] perk: $15 off your first driveway plow from Plowbird with code [CODE]. Order from your phone, pay after it's plowed. plowbird.app

---

## Email to an HOA board or management company

Most townhome and condo HOAs already contract plowing for the whole property, so pitch differently:

| Kind of association | Pitch |
|---|---|
| Single-family HOA (each owner clears their own driveway) | Same as the neighborhood email: blurb plus code. These are the best fit. |
| Townhome/condo HOA with a snow contract | **Resident perk** for what the contract doesn't cover (some contracts skip private walks, patios or extra clears), plus a **backup option** when their contractor is behind after a big storm. |
| Management company | One email can reach dozens of boards. Ask them to include the blurb in their client newsletter or pass it to single-family HOA boards. |

**Subject:** A resident perk for your associations this winter

> Hi [Name / Community Management team],
>
> I'm [Your name], founder of **Plowbird**. We're a new Twin Cities service where homeowners order a local plow truck to their driveway on demand, and we're launching in [Richfield, Edina, Bloomington, St. Louis Park, Roseville and Maplewood] this winter.
>
> For associations where owners clear their own driveways, I'd like to offer residents **$15 off their first plow** with a code just for that community, plus a short blurb boards can drop into their newsletter or resident portal (below).
>
> For associations with a snow contract, Plowbird can be a backup when the contractor is behind after a big storm. There's no contract or retainer, and the association pays per driveway only when it orders.
>
> Would any of the communities you manage be a good fit? I'm happy to set up a code for each one, so you can see what residents actually use.
>
> Thanks,
> [Your name]
> Plowbird · plowbird.app · [phone]
> [Business mailing address]

*(The "association pays per driveway" option needs an account that can book several addresses and get one bill. Check the app supports that before offering it. Otherwise leave that paragraph out.)*

---

## Follow-up and tracking

- One polite follow-up after 7 days. Newsletter editors are volunteers, so be patient.
- Add `status`, `code` and `issue_date` columns to `neighborhood-orgs.csv` as you go.
- Monthly: count redemptions per code and send each association its number (and donation, if any).
