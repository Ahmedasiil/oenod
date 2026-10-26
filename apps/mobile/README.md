# OENOD mobile app (iOS and Android)

The employee app: clock in and out with location, see and swap shifts, pick up open shifts,
ask the AI Business Manager, read payslips, request time off and get push notifications.
Each tab only appears when the person's role or grants include that module.
It talks to the same server and database as the web app.

Built with Expo SDK 58 (React Native 0.88) and Expo Router.

## 1. Point it at your server

In `app.json`, set `expo.extra.apiUrl` to your OENOD web address, for example `https://app.yourdomain.com`.
For a one-off build you can instead set `EXPO_PUBLIC_API_URL`.

Also change, if you want your own identifiers:
- `expo.ios.bundleIdentifier` and `expo.android.package` (now `com.oenod.app`)
- `expo.name`, the icons in `assets/` and the splash colour

## 2. Run it on your phone

```bash
pnpm install          # from the repository root
cd apps/mobile
npx expo start        # scan the QR code with a development build or Expo Go
```

## 3. Build for the stores

You need an Expo account (free), an Apple Developer account and a Google Play Console account.

```bash
npx eas-cli@latest login
npx eas-cli@latest init          # creates the EAS project and writes its id
```

`eas init` gives you a project id. Put it in `app.json` under `expo.extra.eas.projectId`
(replace `REPLACE_WITH_YOUR_EAS_PROJECT_ID`). Push notifications stay off until this is set.

```bash
pnpm build:ios        # App Store build
pnpm build:android    # Play Store build (.aab)
pnpm submit:ios       # upload to App Store Connect
pnpm submit:android   # upload to Google Play
```

EAS asks for your Apple and Google credentials during the build and stores signing keys for you.

## 4. Push notifications

- iOS: EAS sets up the push key the first time you build. Nothing else to do.
- Android: create a Firebase project, add an Android app with your package name, download
  `google-services.json`, put it in this folder and add `"googleServicesFile": "./google-services.json"`
  under `expo.android` in `app.json`. Then upload the FCM key in your Expo project's credentials.
- Optional: create an Expo access token with push permission and set `EXPO_ACCESS_TOKEN` on your server
  (hosting settings or the super admin plugin centre). Without it, pushes still send.

The server sends a push whenever it creates a notification for a person: leave approved,
shift picked up, swap requests, and so on. Tapping it opens the matching screen.

## 5. Maintenance and forced updates

The app checks `/api/platform/status` on launch and every two minutes.
In Super admin, Controls, Mobile apps you can:
- put the apps in maintenance (people see a "we'll be right back" screen; super admins can still get in),
- switch to view-only (a banner shows and changes are paused),
- set a minimum version and store link (older apps show an "Update required" screen).

Bump `expo.version` in `app.json` for each store release so the version check works.

## Location

Location is read only when someone clocks in or out, and, if they turn on
"Share live location" in More, every two minutes while they are clocked in and the app is open.
The app does not track people in the background or when they are off the clock.
