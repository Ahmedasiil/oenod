// 4.3 (434): Twilio Voice finds the app's screen by its launcher name. With a seasonal app icon turned on, the launcher
// is an alias (not a real class), so Twilio got null and the app closed as soon as an outgoing call started ringing.
// This makes it follow the alias to the real screen. Runs after npm install.
const fs = require('fs');
const path = require('path');
const f = path.join(__dirname, '..', 'node_modules', '@twilio', 'voice-react-native-sdk', 'android', 'src', 'main', 'java', 'com', 'twiliovoicereactnative', 'VoiceApplicationProxy.java');
if (!fs.existsSync(f)) process.exit(0);
let s = fs.readFileSync(f, 'utf8');
if (s.includes('OENOD alias fix')) process.exit(0);
const old = `    try {
      return Class.forName(Objects.requireNonNull(componentName).getClassName());
    } catch (ClassNotFoundException e) {
      e.printStackTrace();
      return null;
    }`;
const neu = `    // OENOD alias fix: the launcher can be an activity-alias (seasonal app icons); use the activity it points to.
    try {
      return Class.forName(Objects.requireNonNull(componentName).getClassName());
    } catch (ClassNotFoundException e) {
      try {
        String target = context.getPackageManager().getActivityInfo(componentName, android.content.pm.PackageManager.MATCH_DISABLED_COMPONENTS).targetActivity;
        if (target != null) return Class.forName(target);
      } catch (Exception ignored) { }
      try { return Class.forName(packageName + ".MainActivity"); } catch (ClassNotFoundException e2) { return null; }
    }`;
if (!s.includes(old)) { console.error('patch-twilio: code changed, check VoiceApplicationProxy.java'); process.exit(1); }
s = s.replace(old, neu);
s = s.replace('ComponentName componentName = Objects.requireNonNull(launchIntent).getComponent();',
  'if (launchIntent == null) { try { return Class.forName(packageName + ".MainActivity"); } catch (ClassNotFoundException e) { return null; } }\n    ComponentName componentName = launchIntent.getComponent();');
fs.writeFileSync(f, s);
console.log('patch-twilio: done');
