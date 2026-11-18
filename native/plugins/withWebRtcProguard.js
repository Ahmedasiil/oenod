// 4.3: keep the WebRTC classes the meeting room uses when Android shrinks the release app (R8),
// and don't fail on optional decoder classes WebRTC refers to but doesn't ship (Dav1dDecoder).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const RULES = `
# OENOD Meet (react-native-webrtc)
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
`;
module.exports = (config) => withDangerousMod(config, ['android', async (c) => {
  const f = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
  const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (!cur.includes('OENOD Meet (react-native-webrtc)')) fs.writeFileSync(f, cur + RULES);
  return c;
}]);
