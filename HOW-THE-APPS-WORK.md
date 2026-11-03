# OENOD apps: how they connect to oenod.com, and how to publish them

## 1. How the app connects to the website (the simple version)

The OENOD app on a phone or computer is a **window onto https://oenod.com**.

- When someone opens the app, it loads your live website, the same server and the same database.
- They sign in with the **same email and password** they use on oenod.com.
- Everything is shared in real time. A shift you publish on the website shows on the phone, and a clock-in on the phone shows on the dashboard right away.
- When we change or add something on the website, **every app gets it at once**. Nobody has to update the app. A new store upload is needed only when we add a new phone permission or change the icon.
- The app adds what a website alone can't do: its own icon, full screen, camera for QR scanning, location for clock-in, notifications, and links to oenod.com opening inside the app.
- If the phone has no internet, the app shows an "You are offline, Try again" screen instead of an error.

```
 Phone app / Desktop app  ──HTTPS──▶  https://oenod.com  ──▶  OENOD database (your WHC server)
        (same login)                  (same website)            (one source of truth)
```

## 2. What is ready now

| Device | File | Where people get it |
|---|---|---|
| Android | `OENOD-3.0.0.apk` (signed) | Direct download on oenod.com/#/download, works today |
| Android | `OENOD-3.0.0.aab` (signed) | You upload this to Google Play |
| Windows | `OENOD-Setup-3.0.0.exe` | Direct download on the download page |
| Mac | `OENOD-3.0.0.dmg` (Intel and Apple chips) | Direct download on the download page |
| Linux | `OENOD-3.0.0.AppImage` | Direct download |
| iPhone / iPad | Xcode project (`OENOD-iOS-Xcode-project.zip`) | Only through the App Store, after Apple approves |

### Turn on the download buttons (1 minute, do this first)

The files are already on your server. Paste three links once and the download page switches from the web-install card to real download buttons:

1. Go to **https://oenod.com/#/login** and sign in as super admin (`info@oenod.com`).
2. Open **OENOD HQ → Platform → App store links**.
3. Paste:
   - **Android:** `https://oenod.com/downloads/OENOD-3.0.0.apk`
   - **Windows:** `https://oenod.com/downloads/OENOD-Setup-3.0.0.exe`
   - **Mac:** `https://oenod.com/downloads/OENOD-3.0.0.dmg`
   - **iOS:** leave empty until Apple approves the app.
4. Click **Save**, then open **https://oenod.com/#/download** to check.

Linux users can download `https://oenod.com/downloads/OENOD-3.0.0.AppImage`.

When the Google Play version is live, replace the Android link with the Play Store link.

## 3. Google Play, click by click

You need a Google Play developer account ($25 USD, one time): https://play.google.com/console

1. Go to **play.google.com/console** and sign in. Pay the $25 and verify your identity (Google asks for ID, this can take 1 to 2 days).
2. Click **Create app**. App name: **OENOD**. Default language: English. App or game: **App**. Free or paid: **Free**. Tick the boxes, click **Create app**.
3. In the left menu open **Test and release → Production** (or **Internal testing** first, to try it on your own phone). Click **Create new release**.
4. When asked about app signing, choose **Use Google-generated key** (recommended). Click **Upload** and pick `OENOD-3.0.0.aab`.
5. Release name: `3.0.0`. Release notes: "First release of OENOD." Click **Next**, then **Save**.
6. Go back to the **Dashboard** and finish every item under "Set up your app". The answers are ready in `STORE-LISTING.md`:
   - Privacy policy: `https://oenod.com/#/privacy`
   - App access: give the demo login (Google needs to sign in)
   - Ads: **No ads**
   - Content rating: fill the questionnaire (Business app, no violence etc.)
   - Target audience: **18 and over**
   - Data safety: use the table in `STORE-LISTING.md`
   - Store listing: name, short and long description, icon (512 × 512), feature graphic (1024 × 500), phone screenshots (in `OENOD-apps.zip → store-screenshots/android`)
7. Click **Send for review**. Review usually takes 1 to 7 days (new accounts often need a 14-day closed test with 12 testers first; Google tells you if this applies to you).
8. When it is live, copy the Play Store link (it looks like `https://play.google.com/store/apps/details?id=com.oenod.app`) and paste it in **OENOD HQ → Platform → App store links → Android**. The download page then shows "Get it on Google Play".

**Keep the signing key safe.** `oenod-upload-key.jks` and its password (in `ANDROID-SIGNING-KEY.txt`) are your *upload key*. Google re-signs the app for users, so if you ever lose the upload key, Google can reset it, but it takes a few days. Save both files in a safe place (for example a password manager or a USB drive), not only here.

**App links:** after the first upload, open Play Console → **Test and release → Setup → App signing**, copy the **SHA-256 certificate fingerprint** under "App signing key certificate", and paste it in **OENOD HQ → Website → Apps → Open OENOD links in the apps**. Also paste the upload key fingerprint from `ANDROID-SIGNING-KEY.txt` there, so links open in the APK version too.

## 4. Apple App Store, click by click

Apple only lets iPhone apps be installed from the App Store, so there is no file people can download. You need:
- An **Apple Developer** account, $99 USD a year: https://developer.apple.com/programs/enroll
- A **Mac** with **Xcode** (free from the Mac App Store).

Steps on the Mac:
1. Install **Xcode** from the Mac App Store and open it once. Install **Node.js 22** from https://nodejs.org.
2. Unzip `OENOD-iOS-Xcode-project.zip`. Open the **Terminal** app, type `cd ` (with a space), drag the `mobile` folder into the window, press Enter.
3. Type `npm install` and press Enter. Then type `npx cap open ios` and press Enter. Xcode opens the OENOD project.
4. In Xcode, click **App** in the left list, then the **Signing & Capabilities** tab. Tick **Automatically manage signing** and choose your team under **Team**. The bundle ID is `com.oenod.app`.
5. At the top, pick **Any iOS Device (arm64)**. Then **Product → Archive**. Wait a few minutes.
6. The Organizer window opens. Click **Distribute App → App Store Connect → Upload**, then **Next** until it uploads.
7. Go to **appstoreconnect.apple.com → Apps → +  → New App**. Platform iOS, name **OENOD**, bundle ID `com.oenod.app`, SKU `oenod`.
8. Fill in the listing from `STORE-LISTING.md` and add the iPhone screenshots (`store-screenshots/ios`). Under **App Review Information**, give Apple a demo login.
9. Pick the build you uploaded and click **Add for Review**. Review usually takes 1 to 3 days.
10. When approved, copy the App Store link and paste it in **OENOD HQ → Platform → App store links → iOS**.

If you have no Mac: tell me. I can run the iPhone build for you on a Mac in the cloud once you have the Apple Developer account and add your Apple keys, or a friend's Mac can do steps 1 to 6 in about 30 minutes.

**Until the App Store version is approved,** iPhone users can already install OENOD from the website: open **oenod.com/#/download** in Safari, tap **Share → Add to Home Screen**. It gets the OENOD icon and opens full screen.

## 5. Windows and Mac warnings (normal for a first release)

The desktop installers are not yet signed with a paid certificate, so:
- **Windows** shows "Windows protected your PC". Click **More info → Run anyway**. To remove this, buy a code-signing certificate (or use Microsoft's Azure Trusted Signing, about $10 a month) and I'll sign the next build.
- **Mac** may say the app "can't be opened because Apple cannot check it". Open **System Settings → Privacy & Security**, scroll down, click **Open Anyway**. With your Apple Developer account ($99, same as for iPhone) I can sign and notarize the Mac app so this goes away.

## 6. Building new versions later

The app source and the automatic build are on GitHub: https://github.com/Ahmedasiil/oenod/tree/apps-build. Every change pushed to that branch builds all apps again on GitHub's machines (free). To publish a store update, raise `build` in `oenod.app.json` by 1.
