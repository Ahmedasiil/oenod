// 4.4: Google Play counted portrait screens and Wi-Fi as required hardware (added by libraries), which hides the app
// from tablets in landscape-only setups and devices without Wi-Fi. Mark them optional; the app works without both.
const { withAndroidManifest } = require('@expo/config-plugins');
const OPTIONAL = ['android.hardware.screen.portrait', 'android.hardware.wifi'];
module.exports = (config) => withAndroidManifest(config, (c) => {
  const m = c.modResults.manifest;
  m.$ = m.$ || {};
  m.$['xmlns:tools'] = m.$['xmlns:tools'] || 'http://schemas.android.com/tools';
  const list = (m['uses-feature'] = m['uses-feature'] || []);
  for (const name of OPTIONAL) {
    const f = list.find((x) => x.$ && x.$['android:name'] === name);
    if (f) { f.$['android:required'] = 'false'; f.$['tools:replace'] = 'android:required'; }
    else list.push({ $: { 'android:name': name, 'android:required': 'false', 'tools:replace': 'android:required' } });
  }
  return c;
});
