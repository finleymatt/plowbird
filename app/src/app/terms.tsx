import { A, B, Bullets, ContactBlock, DraftNotice, EmailLink, H, LEGAL_ENTITY, LegalPage, P, Updated } from '@/components/legal';

// DRAFT. Needs review by a Minnesota attorney before launch. Facts here mirror the code:
// payments.js (hold at booking, capture on completion), promos.js (FIRSTPLOW), storm-pass.js
// (triggers and exclusions), messages.js (chat window), routes.js (cancel until on the way).
export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <>
          <Updated />
          <DraftNotice>
            Draft. These terms have not yet been reviewed by a Minnesota attorney and should not be relied on as final until they are.
            Bracketed items are placeholders.
          </DraftNotice>
        </>
      }>
      <P>
        These Terms of Service (“Terms”) are an agreement between you and {LEGAL_ENTITY} (“Plowbird,” “we,” “us”). They cover the Plowbird
        website at plowbird.app, the Plowbird mobile apps and the services offered through them (together, the “Service”). By creating an account,
        requesting a plow, starting a Storm Pass or accepting a job, you agree to these Terms and to our <A href="/privacy">Privacy Policy</A>.
      </P>

      <H>1. What Plowbird is</H>
      <P>
        Plowbird is a marketplace. It connects people who need snow cleared (“Customers”) with independent snow-plow operators (“Drivers”). Plowbird
        does not plow snow itself and does not employ the Drivers. When a Driver accepts your request, the plowing service is provided by that Driver.
        Plowbird provides the app, matching, pricing, payment processing, in-app chat and customer support.
      </P>
      <P>The Service is currently available in parts of Minnesota and South Dakota. You must be at least 18 to use it.</P>

      <H>2. Your account</H>
      <Bullets
        items={[
          'You can sign up with an email and password, or with Google or Apple. Keep your sign-in details secure; you are responsible for activity on your account.',
          'Give accurate information, including your name, the address to be plowed and your driveway size. Prices and Driver instructions depend on it.',
          'One person per account. Don’t create extra accounts to get around a suspension or a promo limit.',
        ]}
      />

      <H>3. Drivers are independent contractors</H>
      <P>
        Drivers are independent businesses, not employees, agents or partners of Plowbird. Drivers choose when to go online and which jobs to accept,
        provide their own truck, plow and equipment, and decide how to do the work, consistent with the Customer’s instructions and the law. By
        accepting jobs, each Driver confirms that, at all times while online or on a job, they:
      </P>
      <Bullets
        items={[
          'hold a valid driver’s license and keep their vehicle registered, inspected and safe to operate;',
          'carry commercial auto insurance that covers snow-plowing with an attached plow, and commercial general liability insurance covering damage to property and injury to people, in amounts at least [MINIMUM COVERAGE AMOUNTS];',
          'will show proof of that insurance to Plowbird on request and tell us promptly if it lapses or changes;',
          'follow traffic laws and local snow ordinances, and never operate while impaired; and',
          'are responsible for their own taxes, business licenses and expenses.',
        ]}
      />
      <P>
        Drivers are paid through Stripe Connect Express. For each completed job a Driver receives the payout shown when they accept it, plus 100% of
        any tip. Plowbird keeps the rest of the Customer’s price as its fee. Promo discounts come out of Plowbird’s share, not the Driver’s.
      </P>

      <H>4. Prices, card holds and payment</H>
      <Bullets
        items={[
          <>
            <B>Price up front.</B> You see the full price before you request a plow. It depends on your driveway size, snow depth, whether you add
            the sidewalk, and demand during storms, and it includes a service fee.
          </>,
          <>
            <B>Hold at booking.</B> When you request a plow we place a temporary authorization (“hold”) on your card for the price plus any tip. A
            hold is not a charge.
          </>,
          <>
            <B>Charged only when it’s done.</B> We charge your card only after your Driver marks the job complete. If you raise your tip later, the
            extra is charged separately. Tips go 100% to your Driver.
          </>,
          'Card holds expire after about 7 days. For a plow scheduled further out we may charge your saved card when the job is completed, without a hold.',
          'Payments are processed by Stripe. Plowbird never sees or stores your full card number.',
          'If a charge fails after the job is done, you still owe the amount and we may retry your card or ask you to update it.',
        ]}
      />

      <H>5. Cancellations and orders that aren’t accepted</H>
      <Bullets
        items={[
          <>
            <B>Free until your Driver is on the way.</B> You can cancel in the app at no cost while your request is waiting for a Driver, or after
            a Driver accepts but before they start driving to you. The hold is released.
          </>,
          'Once your Driver is on the way, the app no longer lets you cancel. Message your Driver in the app or contact support. If the Driver has already traveled to you, Plowbird may charge some or all of the price to pay them for their time.',
          <>
            <B>Unaccepted orders time out.</B> If no Driver accepts your request within the time shown in the app, it expires automatically, the hold
            on your card is released and you are not charged. Your bank decides how fast a released hold disappears from your statement, usually
            within a few business days.
          </>,
          'A Driver may release a job before heading out. Your request then goes back to other Drivers and your hold stays in place until someone accepts or the request times out.',
        ]}
      />

      <H>6. Refunds and service problems</H>
      <P>
        If your driveway wasn’t plowed, or the job was clearly incomplete, contact us at <EmailLink subject="Problem with my plow" /> within 48 hours
        of completion with photos. Depending on what happened, we may send a Driver back, give a partial or full refund, or give account credit.
        Refunds go to the original card. Weather that falls after your plow is finished is a new job, not a defect.
      </P>

      <H>7. Promo codes</H>
      <Bullets
        items={[
          <>
            <B>FIRSTPLOW</B> takes $10 off your first plow. It is for new customers only (no earlier completed or open plow), limited to one use per
            customer and one per household (service address), and expires at the end of March 31, 2027, Central Time.
          </>,
          'A promo code can’t reduce a price below $0, has no cash value, can’t be transferred or sold, and only one code applies per order.',
          'A cancelled order doesn’t use up a code.',
          'Promo discounts are paid by Plowbird. Your Driver is paid as if no code was used.',
          'We may change or end a promotion at any time, but we will honor a code already applied to an order you have placed. We may cancel discounts obtained by fraud or by abusing these rules, for example with multiple accounts.',
        ]}
      />

      <H>8. Storm Pass</H>
      <P>Storm Pass is an optional monthly subscription that books plows for a driveway automatically when a storm qualifies.</P>
      <Bullets
        items={[
          <>
            <B>Billing.</B> Your card is charged the monthly price when you start, then on the same day each month until you cancel. The price
            depends on the driveway size on your plan, plus the sidewalk add-on if you choose it. There is no extra charge per covered plow; tips are
            optional and go 100% to your Driver.
          </>,
          <>
            <B>What’s covered.</B> A plow is triggered when 2 inches or more of snow is forecast within 24 hours at your address by the National
            Weather Service, or when the NWS issues a Winter Storm, Blizzard, Ice Storm or Heavy Snow Warning for it. We book the plow for about an
            hour after the snow stops and notify you. During long storms, up to 2 plows a day, about 10 hours apart. Any snow depth, for the driveway
            size on your plan, plus sidewalks and front walk if you added them.
          </>,
          <>
            <B>Not covered.</B> Drifting with no new snowfall, ice treatment or salting, roof raking, and hauling snow away. Snow below the trigger can
            be plowed as a regular, separately priced order.
          </>,
          'Triggers rely on forecasts. Plowbird doesn’t guarantee a forecast is accurate, and a plow may be booked for a storm that turns out smaller than forecast. If you think a storm should have been covered and wasn’t, contact support.',
          <>
            <B>Cancelling.</B> Cancel anytime in the app. Cancellation takes effect at the end of the billing period you have paid for; your
            coverage continues until then and you won’t be billed again. We don’t give refunds for partial months.
          </>,
          'We may change Storm Pass prices or coverage with at least 30 days’ notice before your next billing date. If you don’t agree, cancel before then.',
        ]}
      />

      <H>9. Your responsibilities as a Customer</H>
      <Bullets
        items={[
          'Give an accurate address and driveway size, and use driver instructions to point out anything a plow could hit or damage: curbs, landscaping, sprinkler heads, rocks, fences or soft edges. Staking driveway edges before winter is strongly recommended.',
          'Move vehicles, keep pets inside and make sure the Driver can safely reach the driveway (gates, codes, parked cars).',
          'Following your city’s sidewalk-clearing rules is your responsibility unless you added sidewalk clearing to the order.',
          'Arrival times are estimates. Weather, road conditions and demand can delay a Driver.',
        ]}
      />

      <H>10. Damage and claims</H>
      <P>
        If you believe a Driver damaged your property, tell us within 48 hours of the job at <EmailLink subject="Damage claim" />, with photos, the
        address and the date. We will share your claim with the Driver and help you reach the Driver’s insurer. Because Drivers are independent
        contractors who carry their own insurance, the Driver and their insurer are responsible for damage the Driver causes. Plowbird is not an
        insurer, but we may, at our discretion, offer a goodwill credit while a claim is resolved. Drivers aren’t responsible for damage caused by
        objects hidden under snow that weren’t marked or described in the instructions, or for damage that existed before the job.
      </P>
      <P color="textSecondary">[Attorney review: if Plowbird obtains its own contingent liability coverage, describe it here.]</P>

      <H>11. In-app chat</H>
      <P>
        Customers and Drivers can message each other in the app once a Driver accepts a job, until 24 hours after it is completed. Phone numbers are
        not shared. Chat is for coordinating the job, so:
      </P>
      <Bullets
        items={[
          'be respectful; no harassment, threats, hate speech, sexual content or spam;',
          'don’t ask for or share personal phone numbers, emails or payment details, or try to arrange future jobs or payment outside Plowbird;',
          'don’t use chat for emergencies. If anyone is in danger, call 911.',
        ]}
      />
      <P>
        Messages are stored, and Plowbird may review them to resolve support requests, disputes and safety reports, and to enforce these Terms.
      </P>

      <H>12. Prohibited conduct</H>
      <P>You agree not to:</P>
      <Bullets
        items={[
          'give false information, impersonate anyone, or use someone else’s account or card;',
          'abuse promo codes, for example by creating multiple accounts;',
          'take a job found through Plowbird, or pay or accept payment for it, outside Plowbird to avoid fees;',
          'harass, threaten, discriminate against or endanger a Customer, Driver or Plowbird staff;',
          'operate a vehicle unsafely, while impaired, or without the required license and insurance (Drivers);',
          'fake GPS location, job completion or photos;',
          'scrape, reverse engineer, overload or interfere with the Service, or use it for anything unlawful.',
        ]}
      />
      <P>We may suspend or close accounts that break these rules, and may withhold payouts or reverse discounts tied to fraud.</P>

      <H>13. Disclaimers</H>
      <P>
        The Service is provided “as is” and “as available.” Plowbird doesn’t guarantee that a Driver will be available at any particular time, how fast
        one will arrive, or the accuracy of weather data, maps or ETAs. To the extent the law allows, we disclaim all implied warranties, including
        merchantability, fitness for a particular purpose and non-infringement.
      </P>

      <H>14. Limitation of liability</H>
      <P>
        To the fullest extent permitted by law, Plowbird and its owners, employees and agents are not liable for any indirect, incidental, special,
        consequential or punitive damages, or for lost profits, arising from the Service or any job, including acts or omissions of Customers or
        Drivers. Our total liability for any claim relating to the Service is limited to the greater of (a) what you paid Plowbird in the 12 months
        before the claim arose, or (b) $100. Nothing in these Terms limits liability that cannot be limited under Minnesota law, such as for gross
        negligence or willful misconduct.
      </P>
      <P>
        You agree to indemnify Plowbird against claims and costs (including reasonable attorneys’ fees) arising from your breach of these Terms or,
        if you are a Driver, from the services you perform.
      </P>

      <H>15. Governing law and disputes</H>
      <P>
        These Terms are governed by the laws of the State of Minnesota, without regard to conflict-of-law rules. Before filing a claim, contact us
        and give us 30 days to try to resolve it informally. Any dispute that isn’t resolved will be decided in the state or federal courts located
        in Hennepin County, Minnesota, and you and Plowbird consent to their jurisdiction. Either party may bring an eligible claim in small claims
        court instead.
      </P>
      <P color="textSecondary">[Attorney review: decide whether to add an arbitration agreement and class-action waiver.]</P>

      <H>16. Changes and termination</H>
      <P>
        We may update these Terms. If a change is material we will tell you in the app or by email before it takes effect; continuing to use the
        Service after that means you accept the new Terms. You can stop using the Service and ask us to close your account at any time. Sections
        that by their nature should survive (payment obligations, claims, limitation of liability, governing law) survive termination.
      </P>

      <H>17. Contact</H>
      <ContactBlock />
    </LegalPage>
  );
}
