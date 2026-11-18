// 4.3: keep the WebRTC classes the meeting room uses when Android shrinks the release app (R8),
// and don't fail on optional decoder classes WebRTC refers to but doesn't ship (Dav1dDecoder).
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const RULES = `
# OENOD Meet (react-native-webrtc)
-keep class org.webrtc.** { *; }
-dontwarn org.webrtc.**
# OENOD Business Phone (Twilio Voice): its native library looks these classes up by name when it loads,
# so R8 must not remove or rename them (4.3 builds 431/432 crashed on every call because it did).
-keep class com.twilio.** { *; }
-keep interface com.twilio.** { *; }
-keep class tvo.webrtc.** { *; }
-keep interface tvo.webrtc.** { *; }
-keepclasseswithmembernames class * { native <methods>; }
-dontwarn com.twilio.**
-dontwarn tvo.webrtc.**
`;
module.exports = (config) => withDangerousMod(config, ['android', async (c) => {
  const f = path.join(c.modRequest.platformProjectRoot, 'app', 'proguard-rules.pro');
  const cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (!cur.includes('OENOD Business Phone (Twilio Voice)')) fs.writeFileSync(f, cur + RULES);
  return c;
}]);
