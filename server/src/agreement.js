// The driver Independent Contractor Agreement: confidentiality (NDA) and customer non-solicitation.
//
// No non-compete: Minnesota voids covenants not to compete for employees *and* independent
// contractors (Minn. Stat. § 181.988, since July 1, 2023) but allows nondisclosure and customer
// non-solicitation agreements, which is what section 9 and 10 are. Drivers stay free to plow for
// anyone, which also supports their independent-contractor status.
//
// DRAFT FOR ATTORNEY REVIEW. Bump AGREEMENT_VERSION whenever the text changes: drivers who signed
// an older version are asked to sign again before they can go online.
export const AGREEMENT_VERSION = '2026-10-22';

const ENTITY = process.env.LEGAL_ENTITY?.trim() || 'Plowbird';
const ADDRESS = process.env.MAILING_ADDRESS?.trim() || '';
const SUPPORT = process.env.SUPPORT_EMAIL?.trim() || 'support@plowbird.app';
const INSURANCE_MINIMUMS =
  process.env.DRIVER_INSURANCE_MINIMUMS?.trim() ||
  'commercial auto liability covering the vehicle while plowing, and commercial general liability of at least $1,000,000 per occurrence';

// Sections as { title, paragraphs }. `who` fills in the contractor's details.
export function agreementSections(who = {}) {
  const contractor = who.businessName ? `${who.name}, doing business as ${who.businessName}` : who.name || 'the person signing below';
  return [
    {
      title: '1. Who this agreement is between',
      paragraphs: [
        `This Independent Contractor Agreement (the "Agreement") is between ${ENTITY}${ADDRESS ? `, ${ADDRESS}` : ''} ("Plowbird", "we") and ${contractor} ("Contractor", "you"). It takes effect when you sign it electronically below.`,
      ],
    },
    {
      title: '2. What Plowbird does',
      paragraphs: [
        'Plowbird runs an app and website that connect people who need snow cleared ("Customers") with independent snow-removal operators. Through the app, Plowbird offers you snow-removal jobs. You decide which jobs, if any, to accept. Plowbird does not guarantee any number of jobs or any amount of income.',
      ],
    },
    {
      title: '3. You are an independent contractor',
      paragraphs: [
        'You are an independent business, not an employee, partner, agent or joint venturer of Plowbird. You decide when to go online, which jobs to accept, the route you take and how you do the work, consistent with the Customer’s instructions and the law. You may decline any job and you may stop using the app at any time.',
        'You provide and pay for your own truck, plow, fuel, phone, tools, helpers and other expenses. You are not entitled to wages, overtime, benefits, workers’ compensation or unemployment benefits from Plowbird. You have no authority to sign contracts or make promises on Plowbird’s behalf.',
        'You are free to provide snow removal and any other services to anyone else, including Plowbird’s competitors. Nothing in this Agreement is a covenant not to compete.',
      ],
    },
    {
      title: '4. Pay',
      paragraphs: [
        'For each job you complete, Plowbird pays you the payout shown in the app when you accepted the job, plus 100% of any tip the Customer adds. Plowbird keeps the rest of the Customer’s price as its fee. Promotions and discounts come out of Plowbird’s share, not yours.',
        'Payouts are sent through Stripe Connect to the bank account you set up, after the job is marked complete. Plowbird may change payout rates for future jobs by showing the new rates in the app; it never lowers the payout of a job you have already accepted.',
      ],
    },
    {
      title: '5. Taxes',
      paragraphs: [
        'You are responsible for all taxes on what you earn, and for any business licenses or permits your work requires. You will give Stripe your accurate taxpayer information; Plowbird or Stripe will issue any required tax forms (such as Form 1099).',
      ],
    },
    {
      title: '6. License, insurance and safety',
      paragraphs: [
        `While you are online or doing a job, you will hold a valid driver’s license, keep your vehicle registered and safe, and carry at least: ${INSURANCE_MINIMUMS}. Before your first job you will send Plowbird a certificate of insurance showing that coverage and, if Plowbird asks, naming Plowbird as an additional insured. You will tell Plowbird right away if any of it lapses or changes, and you will not go online without it.`,
        'You will follow traffic laws and local snow ordinances, never work while impaired, and never put a person, pet or property at risk to finish a job.',
      ],
    },
    {
      title: '7. Quality of work and damage',
      paragraphs: [
        'You will do each job in a careful, workmanlike way and follow the Customer’s reasonable instructions. You will report any damage, injury or incident to Plowbird within 24 hours, with photos when you can. You and your insurer are responsible for damage or injury you cause.',
      ],
    },
    {
      title: '8. Indemnity',
      paragraphs: [
        'You will defend, indemnify and hold harmless Plowbird and its owners, staff and agents from claims, losses and costs (including reasonable attorneys’ fees) arising from your negligence or willful misconduct, your breach of this Agreement, or your violation of law.',
      ],
    },
    {
      title: '9. Confidentiality (nondisclosure)',
      paragraphs: [
        '"Confidential Information" means non-public information you receive through Plowbird, including: Customer names, addresses, phone numbers, emails, gate or door codes, property details, schedules and order history; Plowbird’s pricing and payout methods, business plans, Customer and driver lists, and non-public features of the app; and information about other drivers.',
        'You will use Confidential Information only to do jobs you accept through Plowbird, keep it secure, and not disclose it to anyone else. When this Agreement ends, or when Plowbird asks, you will delete or return it. This duty lasts while this Agreement is in effect and for 3 years after it ends, and for as long as the law protects it for Customer personal information and trade secrets.',
        'This section does not cover information that is public through no fault of yours, that you already knew before Plowbird gave it to you, or that you must disclose by law (in which case you will tell Plowbird first when the law allows). Under the federal Defend Trade Secrets Act (18 U.S.C. § 1833(b)), you will not be held liable for disclosing a trade secret in confidence to a government official or an attorney solely to report or investigate a suspected violation of law, or in a sealed court filing.',
      ],
    },
    {
      title: '10. Customer non-solicitation',
      paragraphs: [
        '"Plowbird Customer" means any person, household or business you served through the app, or whose information you received through the app, during the 12 months before the act in question.',
        'While this Agreement is in effect and for 12 months after you last complete a job through Plowbird, you will not, directly or through anyone else: (a) solicit or offer to provide snow removal or related services (such as shoveling, salting or lawn care) to a Plowbird Customer outside the app; (b) accept payment for those services from a Plowbird Customer outside the app; or (c) encourage a Plowbird Customer to stop using or reduce their use of Plowbird. Giving a Plowbird Customer your own business card, number or pricing counts as soliciting.',
        'This section does not restrict customers you already served before you joined Plowbird, or customers who find you on their own without you using Plowbird or its Confidential Information. It does not stop you from working for any other company or person. If you are unsure whether a customer is covered, ask Plowbird first.',
      ],
    },
    {
      title: '11. If this Agreement is broken',
      paragraphs: [
        'If you break section 9 or 10, Plowbird may deactivate your account and may ask a court for an injunction (an order to stop) in addition to any damages, because money alone may not fix the harm. In any lawsuit to enforce section 9 or 10, the winning party may recover reasonable attorneys’ fees.',
      ],
    },
    {
      title: '12. Ending this Agreement',
      paragraphs: [
        'Either of us may end this Agreement at any time, for any reason, by notice through the app or by email. Plowbird may also pause or deactivate your account for safety concerns, fraud, low ratings, lapsed license or insurance, or a breach of this Agreement. Sections 5, 7, 8, 9, 10, 11 and 13 to 15 survive after it ends, and you will still be paid for jobs you completed.',
      ],
    },
    {
      title: '13. Limits on Plowbird’s liability',
      paragraphs: [
        'To the extent the law allows, Plowbird is not liable for indirect, incidental or consequential damages or lost profits, and its total liability to you under this Agreement is limited to the payouts owed to you for the 3 months before the claim.',
      ],
    },
    {
      title: '14. Law and courts',
      paragraphs: [
        'Minnesota law governs this Agreement. Any lawsuit about it will be brought in the state or federal courts for Hennepin County, Minnesota, and we both consent to those courts.',
      ],
    },
    {
      title: '15. The rest',
      paragraphs: [
        'This Agreement, the Plowbird Terms of Service and the policies shown in the app are the whole agreement between us about your use of Plowbird as a Contractor. If any part is found unenforceable, it will be enforced as far as the law allows and the rest stays in effect. Plowbird may update this Agreement for the future by asking you to accept a new version in the app; you may not assign it. Notices to Plowbird go to ' +
          SUPPORT +
          '; notices to you go to the email or phone on your account or through the app.',
        'You agree to sign this Agreement electronically. Your typed name below is your signature, with the same effect as a handwritten one. You may print or save a copy at any time from the app.',
      ],
    },
  ];
}

// The exact text that was signed, for the record (stored with the signature and hashed).
export function agreementText(who) {
  return [
    `INDEPENDENT CONTRACTOR AGREEMENT (version ${AGREEMENT_VERSION})`,
    '',
    ...agreementSections(who).flatMap((s) => [s.title.toUpperCase(), ...s.paragraphs, '']),
  ].join('\n');
}
