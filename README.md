# PlowNow

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

| Role     | Email                   |
| -------- | ----------------------- |
| Customer | `customer@plownow.test` |
| Driver   | `driver@plownow.test`   |
| Driver   | `driver2@plownow.test`  |

To test both sides at once in one browser, sign in as the customer at `http://localhost:8081` and as the driver at `http://127.0.0.1:8081`. They're separate origins, so each keeps its own login.

### Testing storms in the off-season

In development, **Account → Developer → Simulate a winter storm** overlays a Winter Storm Warning and a 9.5" forecast on the live NWS data, and runs the storm auto-plow check. Every screen that uses simulated data shows a "Simulated" badge. On the driver job screen, **Simulate drive to driveway (dev)** moves the truck toward the house so you can watch tracking from a desk.

## Layout

```
app/      Expo (React Native) app: iOS, Android, web
  src/app/         routes (expo-router): customer/*, driver/*, sign-in, sign-up
  src/components/  UI kit, weather cards, maps (native + web), landing page
  src/lib/         API client, auth + realtime socket, types
server/   Node API: Express + Socket.IO + SQLite
  src/routes.js    REST endpoints
  src/weather.js   NWS client + US Census geocoder
  src/pricing.js   pricing and storm surge
  src/scheduler.js scheduled-job release + storm auto-plow
```

## Not production-ready yet

- **Payments are simulated.** Card authorization, capture and driver payouts are status fields only. Next step: Stripe (PaymentIntents for customers, Connect Express for driver payouts).
- **Notifications are in-app only** (live banners over the socket). Push notifications need `expo-notifications` plus an EAS project.
- **Database** is a single SQLite file. Move to Postgres before real traffic.
- **Driver onboarding**: no identity, insurance or vehicle verification yet.
- **Location** is foreground-only. Background tracking while the app is minimized needs `expo-task-manager` and a development build.
- **Native builds** have not been run yet. Use `npx eas-cli@latest build` to produce App Store and Play Store binaries. Android release builds need a Google Maps API key (see the `react-native-maps` config plugin).
- Set a strong `JWT_SECRET` and `NODE_ENV=production` (which disables the dev endpoints) when deploying the API.
