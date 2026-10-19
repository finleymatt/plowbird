# Plowbird

On-demand snow plowing for driveways, like DoorDash for plow trucks. Built for Minnesota and South Dakota winters.

One Expo codebase ships the **iOS app, Android app and website**. A Node API handles accounts, jobs, pricing, live tracking and weather.

## Features

**Customers**
- Live conditions for each driveway from the National Weather Service: current temperature and wind chill, 24/48-hour snowfall totals, a forecast strip, and winter alerts (Winter Storm Warning, Blizzard Warning…)
- **Plow now**, or **schedule** any hour in the next 7 days. The app suggests a time about an hour after the snow stops.
- **Storm auto-plow**: pick a threshold (1–6"). When the NWS forecast crosses it, a plow is booked automatically for after the storm.
- Upfront price based on driveway size, length, sidewalk and snow depth, with storm surge during NWS warnings and high demand
- Live tracking on a map with ETA, a status timeline and a call-driver button
- Tip before or after the job (100% goes to the driver), plus 1–5★ ratings
- Multiple driveways (home, cabin, rental…)

**Drivers**
- Online/offline toggle that streams GPS while online
- Nearby job board with a map, payout, distance, depth and tip. Drivers can reserve scheduled jobs ahead of time.
- Job flow: accept → start driving → start plowing → mark clear, with directions and call-customer buttons
- Earnings for today, the last 7 days and all time (80% of each job plus 100% of tips)

**Website**: a marketing landing page at `/` that also runs the full customer and driver app in the browser.

## Run it locally

You need Node 22.5 or newer (the API uses the built-in `node:sqlite`).

```bash
npm install --prefix server
```

```bash
npm install --prefix app
```

```bash
npm run seed --prefix server
```

Start the API (port 4000):

```bash
npm run dev --prefix server
```

Start the app in a second terminal. Press `w` for web, or scan the QR code with **Expo Go** on your phone:

```bash
npm start --prefix app
```

On a phone, the app reaches the API through the same computer that serves the bundle, so keep the phone on the same Wi-Fi. To point it somewhere else, set `EXPO_PUBLIC_API_URL`.

### Demo accounts (password `plowdemo123`)

| Role     | Email                    |
| -------- | ------------------------ |
| Customer | `customer@plowbird.test` |
| Driver   | `driver@plowbird.test`   |
| Driver   | `driver2@plowbird.test`  |

Databases seeded before the rename to Plowbird still have these accounts under `@plownow.test` or `@drift.test`. Run the seed command again to add the new ones.

To test both sides at once in one browser, sign in as the customer at `http://localhost:8081` and as the driver at `http://127.0.0.1:8081`. They're separate origins, so each keeps its own login.

### Testing storms in the off-season

In development, **Account → Developer → Simulate a winter storm** overlays a Winter Storm Warning and a 9.5" forecast on the live NWS data, and runs the storm auto-plow check. Every screen that uses simulated data shows a "Simulated" badge. On the driver job screen, **Simulate drive to driveway (dev)** moves the truck toward the house so you can watch tracking from a desk.

### Turning on Stripe

Without Stripe keys, payments are simulated: jobs only record `authorized`, `captured` or `voided`, and nothing is charged. To use real Stripe **test mode** instead:

1. In the [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys), switch to test mode and copy both API keys. Turn on **Connect** (Settings → Connect) so drivers can onboard with Express accounts.
2. Put the secret key in `server/.env` (copy `server/.env.example`):

   ```
   STRIPE_SECRET_KEY=sk_test_...
   ```

3. Put the publishable key from the same account in `app/.env.local` (copy `app/.env.example`):

   ```
   EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

4. Restart the API and `npm start --prefix app`. Expo reads `EXPO_PUBLIC_` variables when the bundle starts.

Both files are gitignored. Keep the secret key out of the app: only the `pk_test_` key goes in `app/`.

How the money moves:

- **Request:** the customer saves a card (Account → Payment, or on the request screen). Booking places a hold for price + tip, using a PaymentIntent with manual capture.
- **Completed:** the hold is captured. A tip that grew past the hold is charged separately.
- **Cancelled:** the hold is released.
- **After the job:** a raised tip is charged right away. Tips can't be lowered once they're charged.
- **Drivers:** each driver taps **Set up payouts** on the Earnings tab to onboard with Stripe Express. They get 80% of the subtotal plus 100% of tips as a Connect transfer. Earnings made before setup wait until it's finished.

Test with card `4242 4242 4242 4242`, any future expiry, any CVC and any ZIP. For a decline, use `4000 0000 0000 9995`. In Express onboarding (test mode), use the test values Stripe pre-fills, such as SSN `000-00-0000` and routing number `110000000`.

Card entry uses Stripe's PaymentSheet on iOS and Android, and the Payment Element on web. Stripe's React Native SDK ships in Expo Go, so card setup works there. Apple Pay and Google Pay need a development build.

### Sign in with Google and Apple

The buttons appear once the API knows your client IDs. On Render, add them under **plowbird-api → Environment**; no app rebuild needed.

**Google** (free):

1. In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create a project, then configure the OAuth consent screen.
2. Go to **Credentials → Create credentials → OAuth client ID → Web application**.
3. Under **Authorized JavaScript origins**, add `https://plowbird.app` and `http://localhost:8081`.
4. Set this on the API: `GOOGLE_CLIENT_IDS=<the client ID>`.

**Apple** (needs the $99/yr Apple Developer Program):

1. In [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list), enable **Sign in with Apple** on the App ID `com.plowbird.app`.
2. Create a **Services ID** (e.g. `app.plowbird.web`). Configure it with the domain `plowbird.app` and the return URL `https://plowbird.app/`.
3. Set these on the API:
   - `APPLE_SERVICES_ID=app.plowbird.web`
   - `APPLE_CLIENT_IDS=com.plowbird.app,app.plowbird.web,host.exp.Exponent` (`host.exp.Exponent` lets you test in Expo Go)

On iPhone, the native Apple button works in Expo Go. Native Google sign-in needs a development build with `@react-native-google-signin`; until then, Google sign-in is website-only.

### Storm Pass (subscription)

Storm Pass is a monthly plan that plows a driveway automatically every time a storm qualifies. Customers see it at `/storm-pass`, on the home screen, and on the landing page.
- **Prices:** $79 (1-car), $99 (2-car) and $129 (3+ car) per month, plus $15 for sidewalks.
- **Rules:** a storm qualifies when 2"+ of snow is forecast within 24 h, or an NWS Winter Storm, Blizzard, Ice Storm or Heavy Snow Warning is issued. There are at most 2 plows a day, about 10 hours apart.
- **Configuration:** prices and rules live in `server/src/storm-pass.js`. The page shows the eligibility list from there, so the page and the scheduler always agree.
- **Covered plows:** the scheduler books them automatically ($0 to the customer). Drivers are paid as usual: from the platform balance with Stripe, simulated without.
- **Billing:** with Stripe on, each pass is a monthly Stripe subscription on the saved card. Cancelling stops renewal, and coverage runs to the end of the paid month.

### Address search

Suggestions come from a local index of every addressable street segment in Minnesota and South Dakota: 1.2 million house-number ranges from the US Census TIGER/Line address features, with ZIP-to-city names from [GeoNames](https://www.geonames.org/) (CC BY 4.0).
- **First boot:** the API downloads about 78 MB and builds `addresses.db` next to the main database in about a minute. Until then, and for any street the index lacks, search falls back to Photon (OpenStreetMap).
- **Speed:** lookups take a few milliseconds.
- **Location:** set `ADDRESS_DB_PATH` to keep the index somewhere else.

### Live tracking and demo drives

Routes and ETAs come from OSRM (`router.project-osrm.org` by default, or set `OSRM_URL`). With `DEMO_MODE=1` on the API (already set in `render.yaml`), a driver's job screen shows **Demo: drive the route to this driveway**. The truck then follows the real road route for about 70 seconds, so you can show live tracking without a truck on the road. In demo mode, new ASAP orders are also **auto-accepted** by the demo driver (`DEMO_DRIVER_EMAIL`, default `driver@plowbird.test`) about 6 seconds after they're placed. That driver then drives the route automatically, so a customer can watch the whole flow alone. Remove `DEMO_MODE` once real drivers are online, or the demo driver will take every order.

## Layout

```
app/      Expo (React Native) app: iOS, Android, web
  src/app/         routes (expo-router): customer/*, driver/*, sign-in, sign-up
  src/components/  UI kit, weather cards, maps (native + web), landing page
  src/lib/         API client, auth + realtime socket, types
server/   Node API: Express + Socket.IO + SQLite
  src/routes.js    REST endpoints
  src/address-index.js  instant MN/SD address search (US Census TIGER, built on first boot)
  src/geo.js       address search entry point (index first, Photon fallback)
  src/routing.js   driving routes + ETA (OSRM)
  src/social.js    Google / Apple sign-in token checks
  src/payments.js  Stripe: card holds, capture, tips, Connect payouts (simulated without keys)
  src/weather.js   NWS client + US Census geocoder
  src/pricing.js   pricing and storm surge
  src/scheduler.js scheduled-job release + storm auto-plow
```

## Not production-ready yet

- **Payments** use Stripe test mode when keys are set (see [Turning on Stripe](#turning-on-stripe)). Before going live, the API still needs:
  - Stripe webhooks: `payment_intent.*` for out-of-band failures, `account.updated` to pay drivers without waiting for them to open Earnings
  - a way for customers to retry a failed charge
  - refunds for disputes
- **Notifications are in-app only** (live banners over the socket). Push notifications need `expo-notifications` plus an EAS project.
- **Database** is a single SQLite file. Move to Postgres before real traffic.
- **Driver onboarding**: no identity, insurance or vehicle verification yet.
- **Location** is foreground-only. Background tracking while the app is minimized needs `expo-task-manager` and a development build.
- **Native builds** have not been run yet. Use `npx eas-cli@latest build` to produce App Store and Play Store binaries. Android release builds need a Google Maps API key (see the `react-native-maps` config plugin).
- Set a strong `JWT_SECRET` and `NODE_ENV=production` (which disables the dev endpoints) when deploying the API.
