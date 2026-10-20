import { A, B, Bullets, ContactBlock, DraftNotice, EmailLink, H, LEGAL_ENTITY, LegalPage, P, Updated } from '@/components/legal';

// DRAFT. Needs review by a Minnesota attorney before launch. The provider list mirrors the code:
// payments.js (Stripe), live-map.web.tsx (OpenFreeMap), routing.js (OSRM), geo.js (Photon, Census),
// weather.js (NWS), social.js (Google, Apple). Driver location is one overwritten row (jobs.js).
export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          <Updated />
          <DraftNotice>
            Draft. This policy has not yet been reviewed by a Minnesota attorney and should not be relied on as final until it is. Bracketed items
            are placeholders.
          </DraftNotice>
        </>
      }>
      <P>
        This policy explains what {LEGAL_ENTITY} (“Plowbird,” “we”) collects when you use the Plowbird website, apps and services, why, who we share it
        with and the choices you have. The short version: we collect what we need to get your driveway plowed and to pay Drivers, we share it only with
        the people and providers who make that happen, and <B>we don’t sell your personal information.</B>
      </P>

      <H>What we collect</H>
      <Bullets
        items={[
          <>
            <B>Account details:</B> your name, email address and, if you give it, your mobile phone number (required for Drivers so Plowbird can
            reach them). Passwords are stored only as a salted hash.
          </>,
          <>
            <B>Google or Apple sign-in:</B> if you use it, we receive your name, email address (or Apple’s private relay address) and an account
            identifier from Google or Apple. We don’t receive your Google or Apple password.
          </>,
          <>
            <B>Addresses and property details:</B> the addresses you want plowed, their map location, driveway size, sidewalk preference and any
            instructions you write for the Driver (such as gate codes).
          </>,
          <>
            <B>Orders:</B> what you requested, when, the price, tip, status and any Storm Pass subscription.
          </>,
          <>
            <B>Driver applications:</B> if you apply to drive, your ZIP code and service radius, truck and plow details, plowing experience,
            availability, insurance carrier, how you heard about us, any notes you add, and whether your application was approved.
          </>,
          <>
            <B>Driver location:</B> while a Driver is online in the app, we receive their device’s location. We keep only the most recent position,
            not a location history.
          </>,
          <>
            <B>Chat messages</B> between a Customer and a Driver about a job.
          </>,
          <>
            <B>Payment information:</B> card details are entered directly with Stripe and never reach our servers. We receive the card brand, last 4
            digits and expiry so you can see which card is on file, plus records of holds, charges and refunds. For Drivers, Stripe Connect collects
            identity, tax and bank details for payouts; we receive the payout account’s status.
          </>,
          <>
            <B>How you found us:</B> the promo code and campaign tag (for example <B>utm_source=poster</B>) in the link you arrived from, so we know
            which flyers and emails work.
          </>,
          <>
            <B>Technical data:</B> your IP address, browser or device type and server logs, which our hosting provider records when you use the
            Service. The app stores your sign-in session and any pending promo code on your device. We don’t use advertising cookies or ad trackers.
          </>,
        ]}
      />

      <H>Why we use it</H>
      <Bullets
        items={[
          'To create your account and sign you in.',
          'To price a plow, check the weather at your address, match you with a nearby Driver, and show live tracking and ETAs.',
          'To place card holds, charge for completed jobs, bill Storm Pass and pay Drivers.',
          'To let Customers and Drivers chat about a job without sharing phone numbers.',
          'To provide support, handle damage claims and disputes, and keep the Service safe, including preventing fraud and promo abuse (for example, one FIRSTPLOW per household).',
          'To send you messages about your orders and account, and to understand which marketing brings people to Plowbird.',
          'To meet legal, tax and accounting obligations.',
        ]}
      />

      <H>Who we share it with</H>
      <P>
        <B>The other person on your job.</B> When a Driver accepts your request they see your name, the address, driveway details and your instructions.
        You see the Driver’s name, vehicle and live location while the job is active. Phone numbers are never shown to the other party.
      </P>
      <P>
        <B>Service providers</B> that process data for us, only as needed to run the Service:
      </P>
      <Bullets
        items={[
          <>
            <B>Stripe</B>: card payments, holds, refunds, Storm Pass billing and Driver payouts (Stripe Connect).
          </>,
          <>
            <B>Render</B>: hosts our servers, database and website.
          </>,
          <>
            <B>OpenFreeMap</B>: map tiles. Your device loads them directly, which shows OpenFreeMap the map area being viewed and your IP address.
          </>,
          <>
            <B>OSRM</B> (Project OSRM routing service): Driver and driveway coordinates, to work out routes and arrival times.
          </>,
          <>
            <B>U.S. Census Bureau geocoder</B> and <B>Photon</B> (by komoot): the address text you type, to find and confirm your address.
          </>,
          <>
            <B>National Weather Service</B>: the coordinates of your address, to get forecasts and winter alerts.
          </>,
          <>
            <B>Google and Apple</B>: only if you choose to sign in with them.
          </>,
        ]}
      />
      <P>
        We may also disclose information if the law requires it, to protect someone’s safety, to enforce our <A href="/terms">Terms</A>, or as part of
        a merger or sale of the business, in which case this policy continues to apply.
      </P>
      <P>
        <B>No sale of data.</B> We do not sell personal information, and we do not share it for targeted advertising.
      </P>

      <H>How long we keep it</H>
      <Bullets
        items={[
          'Account, address and Storm Pass details: while your account is open.',
          'Orders and payment records: [7] years after the transaction, for tax and accounting.',
          'Chat messages: [2] years after the job, for support, claims and safety, unless we need them longer for an open dispute.',
          'Driver location: only the latest position, replaced each time the app sends a new one.',
          'Server logs: [90 days].',
        ]}
      />
      <P>When you delete your account we delete or anonymize your information, except what we must keep for the reasons above.</P>

      <H>Your choices and rights</H>
      <P>
        You can see and update your name and phone number in the app, and remove saved addresses. To remove a saved card, get a copy of your data, correct it,
        or delete your account and data, email <EmailLink subject="Privacy request" /> from the email address on your account. We’ll confirm it’s you
        and respond within 30 days. Depending on where you live, including under Minnesota’s consumer data privacy law, you may have additional rights;
        we honor these requests for all users, and won’t treat you differently for making one. If we deny a request you can appeal by replying to our
        answer.
      </P>

      <H>Security</H>
      <P>
        We use HTTPS for all traffic, hash passwords, and leave card details to Stripe. No system is perfectly secure; if a breach affects your
        information we will notify you as the law requires.
      </P>

      <H>Children</H>
      <P>Plowbird is for adults. We don’t knowingly collect information from anyone under 18.</P>

      <H>Changes</H>
      <P>If we change this policy in a material way, we’ll tell you in the app or by email before the change takes effect.</P>

      <H>Contact</H>
      <ContactBlock />
    </LegalPage>
  );
}
