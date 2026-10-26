# OENOD desktop app (Windows, Mac and Linux)

A secure desktop window onto your OENOD server, built with Electron.
It opens the web app, keeps people on your server (other links open in their browser),
asks only for location (clock in) and notifications, and follows the
"Desktop app" switches in Super admin, Controls:

- **Maintenance:** people see the "We'll be right back" screen. Super admins can still get in.
- **Minimum version:** older desktop apps show an "Update required" screen with your download link.
- **Offline:** a "You're offline" screen with a Try again button.

## Point it at your server

Set `oenod.appUrl` in `package.json` to your web address (for example `https://app.yourdomain.com`) before building.
An admin can also point an installed app somewhere else by creating `config.json`
in the app's user data folder with `{ "appUrl": "https://..." }`, or by setting `OENOD_URL`.

## Run and build

```bash
pnpm install            # from the repository root
pnpm desktop            # run it
cd apps/desktop
pnpm dist:win           # Windows installer (.exe), build on Windows
pnpm dist:mac           # Mac (.dmg), build on a Mac
pnpm dist:linux         # Linux (.AppImage and .deb)
```

Installers land in `apps/desktop/dist`.

## Signing (recommended before you share it)

- **Mac:** join the Apple Developer Program, install your "Developer ID Application" certificate,
  then set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` before `pnpm dist:mac`
  so electron-builder signs and notarizes the app. Without this, macOS warns people when they open it.
- **Windows:** buy a code-signing certificate and set `CSC_LINK` and `CSC_KEY_PASSWORD`.
  Without it, Windows SmartScreen shows a warning the first few times.

Change `appId`, `productName` and `build/icon.png` (1024 x 1024) in `package.json` if you rebrand.
Bump `version` for each release so the minimum-version check works.
