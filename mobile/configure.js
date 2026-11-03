// Writes capacitor.config.json from ../oenod.app.json so the domain and version live in one place.
const fs = require('fs');
const path = require('path');
const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'oenod.app.json'), 'utf8'));
if (!/^https:\/\//.test(app.url)) throw new Error('oenod.app.json "url" must be your live https:// address');
const host = new URL(app.url).host;
const config = {
  appId: app.appId,
  appName: app.appName,
  webDir: 'www',
  // The app shows your live OENOD site. If the phone is offline, www/index.html shows a friendly retry screen.
  server: { url: app.url, cleartext: false, allowNavigation: app.allowedHosts || [host], errorPath: 'index.html' },
  ios: { contentInset: 'never', limitsNavigationsToAppBoundDomains: false, backgroundColor: '#0B1B3F', scheme: 'OENOD' },
  android: { backgroundColor: '#0B1B3F', allowMixedContent: false, captureInput: true },
  plugins: {
    SplashScreen: { launchShowDuration: 3000, launchAutoHide: true, backgroundColor: '#0B1B3F', showSpinner: false, androidScaleType: 'CENTER_CROP' },
    StatusBar: { style: 'DARK', backgroundColor: '#0B1B3F', overlaysWebView: false },
    LocalNotifications: { smallIcon: 'ic_stat_oenod', iconColor: '#2252D1' },
  },
};
fs.writeFileSync(path.join(__dirname, 'capacitor.config.json'), JSON.stringify(config, null, 2) + '\n');
console.log('capacitor.config.json written for', app.url, 'version', app.version, '(' + app.build + ')');
