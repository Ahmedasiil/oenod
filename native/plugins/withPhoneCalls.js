// iPhone Business Phone calls (CallKit + PushKit through Twilio Voice): VoIP + audio background modes and
// the production push environment, so company calls ring like normal calls, also on a locked phone.
// (Same iOS settings as Twilio's own config plugin, without its Android part, which waits for Firebase.)
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
  return config;
};
