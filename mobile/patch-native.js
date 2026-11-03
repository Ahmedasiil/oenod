// Makes the native projects store-ready. Safe to run many times; runs after "add:ios", "add:android" and "sync".
//  - version and build number from ../oenod.app.json
//  - permissions with clear reasons: location (geofenced clock-in), camera (QR badges, OENOD Meet video),
//    microphone (OENOD Meet, calls), photos (profile pictures, receipts), notifications
//  - links to your OENOD address open the app (Android App Links, iOS Universal Links)
const fs = require('fs');
const path = require('path');
const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'oenod.app.json'), 'utf8'));
const host = new URL(app.url).host;
const version = app.version || '1.0.0', build = String(app.build || 1);
const edit = (f, fn) => { if (!fs.existsSync(f)) return false; const a = fs.readFileSync(f, 'utf8'); const b = fn(a); if (b !== a) fs.writeFileSync(f, b); return true; };

// ---------- Android ----------
const mf = path.join(__dirname, 'android/app/src/main/AndroidManifest.xml');
if (edit(mf, (x) => {
  for (const p of ['INTERNET', 'ACCESS_NETWORK_STATE', 'ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'POST_NOTIFICATIONS', 'VIBRATE', 'SCHEDULE_EXACT_ALARM']) {
    if (!x.includes(`android.permission.${p}"`)) x = x.replace('</manifest>', `    <uses-permission android:name="android.permission.${p}" />\n</manifest>`);
  }
  for (const f of ['android.hardware.camera', 'android.hardware.location.gps', 'android.hardware.microphone']) {
    if (!x.includes(`"${f}"`)) x = x.replace('</manifest>', `    <uses-feature android:name="${f}" android:required="false" />\n</manifest>`);
  }
  if (!x.includes('oenod-app-links')) {
    x = x.replace(/(<activity[\s\S]*?android:name="\.MainActivity"[\s\S]*?>)/, `$1\n            <!-- oenod-app-links: open ${host} links in the app -->\n            <intent-filter android:autoVerify="true">\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="https" android:host="${host}" />\n            </intent-filter>`);
  } else x = x.replace(/android:scheme="https" android:host="[^"]+"/, `android:scheme="https" android:host="${host}"`);
  return x;
})) console.log('Android: permissions and app links set for', host);
const gr = path.join(__dirname, 'android/app/build.gradle');
if (edit(gr, (x) => x.replace(/versionCode\s+\d+/, `versionCode ${build}`).replace(/versionName\s+"[^"]*"/, `versionName "${version}"`))) console.log('Android: version', version, 'build', build);
// Small white notification icon (Android shows it in the status bar).
const drw = path.join(__dirname, 'android/app/src/main/res/drawable');
if (fs.existsSync(drw)) fs.writeFileSync(path.join(drw, 'ic_stat_oenod.xml'), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#FFFFFFFF" android:pathData="M12,2a10,10 0,1 0,0.01 0zM12,6.5a5.5,5.5 0,1 1,-0.01 0zM12,9a3,3 0,1 0,0.01 0z"/>\n</vector>\n`);

// ---------- iOS ----------
const pl = path.join(__dirname, 'ios/App/App/Info.plist');
if (edit(pl, (x) => {
  const add = {
    NSLocationWhenInUseUsageDescription: 'OENOD checks your location once when you clock in, only if your workplace uses a geofence.',
    NSCameraUsageDescription: 'OENOD uses the camera to scan QR badges, take photos of receipts and repairs, and for OENOD Meet video calls.',
    NSMicrophoneUsageDescription: 'OENOD uses the microphone for OENOD Meet video calls and interviews.',
    NSPhotoLibraryUsageDescription: 'OENOD lets you pick photos for your profile, products, receipts and repair requests.',
    NSPhotoLibraryAddUsageDescription: 'OENOD saves your business card QR code and documents to your photos when you ask.',
  };
  for (const [k, v] of Object.entries(add)) {
    if (x.includes(`<key>${k}</key>`)) x = x.replace(new RegExp(`(<key>${k}</key>\\s*<string>)[^<]*(</string>)`), `$1${v}$2`);
    else x = x.replace(/<dict>/, `<dict>\n\t<key>${k}</key>\n\t<string>${v}</string>`);
  }
  if (!x.includes('<key>ITSAppUsesNonExemptEncryption</key>')) x = x.replace(/<dict>/, '<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>');
  return x;
})) console.log('iOS: permission texts set');
const ent = path.join(__dirname, 'ios/App/App/App.entitlements');
if (fs.existsSync(path.dirname(ent))) {
  fs.writeFileSync(ent, `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n\t<key>com.apple.developer.associated-domains</key>\n\t<array>\n\t\t<string>applinks:${host}</string>\n\t\t<string>webcredentials:${host}</string>\n\t</array>\n</dict>\n</plist>\n`);
  console.log('iOS: universal links for', host);
}
const pbx = path.join(__dirname, 'ios/App/App.xcodeproj/project.pbxproj');
if (edit(pbx, (x) => {
  x = x.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`).replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${build};`);
  if (!x.includes('CODE_SIGN_ENTITLEMENTS')) x = x.replace(/(INFOPLIST_FILE = App\/Info\.plist;)/g, '$1\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
  return x;
})) console.log('iOS: version', version, 'build', build);
