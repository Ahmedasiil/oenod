// Business Phone calls through Twilio Voice, so company calls ring like normal phone calls, also on a locked phone.
// iPhone: CallKit + PushKit (VoIP + audio background modes, production push environment).
// Android (3.9.2): Twilio's own plugin wires the app; this adds the OENOD ringtone and vibration to the
// full-screen incoming call (Answer / Decline) that Twilio's SDK shows on the lock screen.
const { withInfoPlist, withEntitlementsPlist, withDangerousMod, withXcodeProject, IOSConfig } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');
const RING = 'oenod_ring.caf'; // the OENOD business-call ringtone, so company calls sound different from personal ones

module.exports = function withPhoneCalls(config) {
  config = withInfoPlist(config, (c) => {
    const modes = new Set(c.modResults.UIBackgroundModes || []);
    modes.add('voip');
    modes.add('audio');
    modes.delete('location');
    c.modResults.UIBackgroundModes = Array.from(modes);
    return c;
  });
  config = withEntitlementsPlist(config, (c) => {
    c.modResults['aps-environment'] = 'production';
    return c;
  });
  // Ship the ringtone in the app bundle (CallKit only plays bundled sounds).
  config = withDangerousMod(config, ['ios', async (c) => {
    const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    fs.copyFileSync(path.join(c.modRequest.projectRoot, 'assets/sounds', RING), path.join(c.modRequest.platformProjectRoot, name, RING));
    return c;
  }]);
  config = withXcodeProject(config, (c) => {
    const name = IOSConfig.XcodeUtils.getProjectName(c.modRequest.projectRoot);
    if (!c.modResults.hasFile(`${name}/${RING}`)) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({ filepath: `${name}/${RING}`, groupName: name, project: c.modResults, isBuildFile: true });
    }
    return c;
  });
  // Android: the OENOD ringtone replaces Twilio's default "incoming" sound (app resources win over the library's).
  config = withDangerousMod(config, ['android', async (c) => {
    const raw = path.join(c.modRequest.platformProjectRoot, 'app/src/main/res/raw');
    fs.mkdirSync(raw, { recursive: true });
    fs.copyFileSync(path.join(c.modRequest.projectRoot, 'assets/sounds/oenod_ring.wav'), path.join(raw, 'incoming.wav'));
    // Vibrate like a phone call: Twilio's call notification channel is silent (the SDK plays the ringtone itself)
    // and has no vibration, so turn vibration on for its channels. Idempotent; runs on the installed SDK source.
    const f = path.join(c.modRequest.projectRoot, 'node_modules/@twilio/voice-react-native-sdk/android/src/main/java/com/twiliovoicereactnative/NotificationUtility.java');
    let src = fs.readFileSync(f, 'utf8');
    const anchor = '.setGroup(Constants.VOICE_CHANNEL_GROUP);';
    if (!src.includes('/* oenod vibrate */')) {
      if (!src.includes(anchor)) throw new Error('withPhoneCalls: Twilio NotificationUtility changed; update the vibration patch');
      src = src.replace(anchor, '.setGroup(Constants.VOICE_CHANNEL_GROUP)\n        /* oenod vibrate */ .setVibrationEnabled(Constants.VOICE_CHANNEL_HIGH_IMPORTANCE.equals(voiceChannelId))\n        .setVibrationPattern(new long[] {0, 1000, 1000, 1000, 1000, 1000, 1000});');
      fs.writeFileSync(f, src);
    }
    return c;
  }]);
  return config;
};
