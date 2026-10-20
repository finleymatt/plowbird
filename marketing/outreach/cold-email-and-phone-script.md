# Cold email and phone script: landscaping and snow businesses

**Who:** the businesses in `driver-leads.csv`. Start with the small ones in the pilot suburbs (Kyle's, Bloomington Mow and Snow, Joe's, Trierweiler, Quality Snowplowing, Alex's, Blizzard). The big ones (KG, Peter Doran, Anderson) are less likely to need work, but a single overflow partner there could cover a whole suburb.

**When:** now through mid-November, before their routes fill up. Tuesday–Thursday, 9–11 am or 1–3 pm. Avoid calling the day of a storm.

**The angle:** Plowbird isn't competing for their contract customers. It sends **one-off, paid driveway jobs near their existing routes**: people who never sign seasonal contracts, plus overflow on big storms. No sales calls, no estimates, no invoices.

---

## Email

**Subject options** (pick one):
- Paid driveway jobs near your routes this winter
- Overflow plow work in [Richfield] – no invoicing
- Question about your plow trucks this winter

**Body:**

> Hi [first name, or "there"],
>
> I'm [Your name], founder of Plowbird, a new app where Twin Cities homeowners order a driveway plow on demand. We're launching in Richfield, Edina, Bloomington, St. Louis Park, Roseville and Maplewood this winter, and I saw on your site that [Business] plows in [City].
>
> I'm looking for a few local operators to take Plowbird jobs between their contract routes:
>
> - **$36 for a standard 2-car driveway**, more for bigger driveways, deep snow and storm surges, plus **100% of tips**
> - **You pick the jobs.** You see the address and pay before accepting. Take them only when you have a truck free.
> - **Paid through Stripe** to your bank after each job. We handle billing, collections and customer messages.
> - These are one-off customers who don't sign seasonal contracts, so we're not competing for your accounts. If a Plowbird customer later wants a seasonal contract with you, that's your business.
>
> Drivers need commercial auto insurance with plow coverage and liability insurance, which I'd guess you already carry. Signing up takes about 5 minutes at **plowbird.app/drive**.
>
> Would you have 10 minutes this week for a quick call? I'm at [phone].
>
> Thanks,
> [Your name]
> Plowbird · plowbird.app
> [Business mailing address]

**Follow-up (5–7 days later, reply in the same thread):**

> Hi [name], just bumping this before the snow starts. We're approving drivers in [City] now. Even 2–3 jobs on a storm night near your route is easy money for a truck that's already out. Sign-up is at plowbird.app/drive, or reply with a good time to call. – [Your name]

Stop after two emails. Mark the row in `driver-leads.csv` (add a `status` column) so nobody gets a third.

> **The "no competing" line is a promise.** Keep it only if it holds. If Plowbird ever offers Storm Pass to that company's own contract customers, edit it.

---

## Phone script

**Opening (15 seconds):**

> "Hi, is this [Business]? Great. My name's [Your name], I'm calling from Plowbird. We're a new Twin Cities app that sends paid driveway plow jobs to local operators. Is this the right person to talk to about your plow trucks? ... Do you have two minutes?"

*(If no:)* "No problem. Can I email you the details? What's the best address?" → send the email above.

**Pitch (30 seconds):**

> "Homeowners in [Richfield / Edina / ...] open our app and order a plow, kind of like ordering a ride. Drivers near them get the job with the address and the pay, and take it or skip it. A standard 2-car driveway pays $36, more for bigger ones and deep snow, and drivers keep 100% of tips. We bill the customer, so you never invoice or chase payment. It's paid through Stripe after each job."

**The question that matters:**

> "On a typical storm, do you have trucks with gaps between route stops, or do you run full all night?"

- **Gaps / slow nights / early-season storms** → "That's exactly what this is for. You could pick up a few jobs right on your way."
- **Full every storm** → "Makes sense. A lot of crews are full on the big ones. Would it help on smaller 2–3 inch snows, or late-season storms when the contracts are done?"
- **"I only do commercial"** → "Got it. Do any of your guys have their own plow pickups and want side work? Happy to send you the driver info to pass along."

**Objections:**

| They say | You say |
|---|---|
| "$36 is low." | "It's per driveway, usually 10–15 minutes, and you only take jobs close to where you already are. Bigger driveways, sidewalks and deep snow pay more, and storms pay a surge. Tips are 100% yours." |
| "Are you going to steal my customers?" | "No. These are people who don't have a contract with anybody. They order on the morning after a storm. If one wants a seasonal contract, that's between you and them." |
| "What about insurance and liability?" | "You'd plow under your own commercial auto with plow coverage and your liability policy, same as any job you do now. We check proof of insurance when you sign up." |
| "How do I get paid?" | "Stripe sends it to your bank account after each job. No invoices." |
| "I'm not into apps." | "It's one screen: job, address, pay, accept. You can see it at plowbird.app/drive. I can also walk you through it on the phone in five minutes." |

**Close:**

> "Easiest next step is the sign-up at plowbird.app/drive. It takes about five minutes, and I'll call you back to approve you before the first snow. Can I text you the link?"

*(Text only if they say yes.)* → "Thanks [name], here's the Plowbird driver sign-up: plowbird.app/drive?utm_source=cold-call. – [Your name]"

**After the call:** note the outcome in the CSV: `interested`, `call back [date]`, `no`, `wrong number`.

---

## Rules to stay on the right side of

- **Email:** CAN-SPAM covers commercial emails to businesses too. Use an honest subject line, a real reply-to address, and your postal address in the signature. Stop when someone says no. No tracking pixels are needed.
- **Calls:** calling a business's published number about business services is fine. Don't use an autodialer or prerecorded messages. Honor "don't call again" right away.
- **Texts:** only text someone who said yes to a text on the call.
