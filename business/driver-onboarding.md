# Driver onboarding: what happens after someone applies

| Step | Who | Where | What happens |
|---|---|---|---|
| 1. Apply | Driver | plowbird.app/apply | Truck, plow, area, insurance answers, license state and expiry, 21+, and a signed acknowledgment that they're an independent contractor. |
| 2. Call and approve | Danny or Matt | /admin → Drivers | A 10-minute call: check their license and insurance papers and a photo of the truck with the plow. Then **Approve**. |
| 3. Agreement goes out automatically | App | /driver-agreement | On approval the driver gets a notice in the app (and an email, once email is set up) with a link to sign the Independent Contractor Agreement. |
| 4. Driver signs | Driver | /driver-agreement | Typed-name e-signature. The exact text, time, IP and a fingerprint (SHA-256) are stored, and the driver gets a copy. You can read it on their card in /admin. |
| 5. Certificate of insurance | Driver's agent → us | support@plowbird.app → /admin | The agent emails a COI. On the driver's card, enter the policy expiration date and click **Mark COI received**. |
| 6. Ready | — | — | The driver's job board opens. They can go online and accept jobs. If the COI expires, they're blocked again until a new one is recorded. |
| 7. Payouts | Driver | Earnings tab | Stripe Express setup (bank account, SSN or EIN for their 1099). Can be done any time; earnings wait until it's done. |

## What's in the agreement

`server/src/agreement.js` (shown on /driver-agreement):

1. Parties
2. What Plowbird does
3. Independent contractor (they control hours, jobs and methods, and can work for anyone)
4. Pay
5. Taxes
6. License, insurance and safety
7. Quality of work and damage
8. Indemnity
9. **Confidentiality / NDA:** customer info, gate codes, pricing and business info. Lasts 3 years after the agreement ends, and longer for customer personal data and trade secrets. Includes the federal whistleblower notice.
10. **Customer non-solicitation:** no side deals with customers they served or learned about through Plowbird, during the agreement and for 12 months after their last job. Their own pre-existing customers are excluded.
11. Remedies (deactivation, injunction, attorneys' fees)
12. Ending the agreement (either side, any time)
13. Liability limit
14. Minnesota law and Hennepin County courts
15. E-signature and the remaining standard terms

## Why there's no non-compete

Minnesota made non-competes void for employees **and independent contractors** as of July 1, 2023 (Minn. Stat. § 181.988). The same law allows **nondisclosure** and **customer non-solicitation** agreements, which is what protects Plowbird's customers. Letting drivers plow for anyone else also supports treating them as independent contractors rather than employees.

## Before the first real driver signs ⚖️

Bring this to the attorney:
- Review `server/src/agreement.js`: the 12-month non-solicit, the 3-year confidentiality term, indemnity, the liability cap, and Hennepin County venue.
- Contractor classification under Minnesota law, and whether anything in the app makes drivers look like employees.
- Whether to add arbitration or a class-action waiver.
- Insurance minimums, from the broker.

Then:
- **On Render (plowbird-api → Environment):**
  - `LEGAL_ENTITY` (e.g. "Plowbird LLC")
  - `MAILING_ADDRESS`
  - `DRIVER_INSURANCE_MINIMUMS` (the broker's wording)
- **For emails:**
  - set `RESEND_API_KEY` and `MAIL_FROM`
  - verify the plowbird.app domain in Resend first
- **If the attorney changes the text:** edit `agreement.js` and bump `AGREEMENT_VERSION`. Anyone who signed the old version is asked to sign again.
