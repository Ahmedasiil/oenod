// Adds the Wear OS app (native/wear-app) as the android/wear module during prebuild.
// Build it with: cd android && ./gradlew :wear:bundleRelease
const { withDangerousMod, withSettingsGradle } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const copy = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const a = path.join(from, f), b = path.join(to, f);
    if (fs.statSync(a).isDirectory()) copy(a, b); else fs.copyFileSync(a, b);
  }
};

module.exports = function withWear(config) {
  config = withSettingsGradle(config, (c) => {
    if (!c.modResults.contents.includes("include ':wear'")) c.modResults.contents += "\ninclude ':wear'\n";
    return c;
  });
  return withDangerousMod(config, ['android', async (c) => {
    const root = c.modRequest.projectRoot, android = c.modRequest.platformProjectRoot;
    const dest = path.join(android, 'wear');
    copy(path.join(root, 'wear-app'), dest);
    // Same launcher icon as the phone app.
    const res = path.join(android, 'app', 'src', 'main', 'res');
    if (fs.existsSync(res)) for (const d of fs.readdirSync(res)) if (d.startsWith('mipmap') && !d.includes('anydpi')) copy(path.join(res, d), path.join(dest, 'src', 'main', 'res', d));
    return c;
  }]);
};
