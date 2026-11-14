// iPhone Business Phone calls (CallKit + PushKit through Twilio Voice): VoIP + audio background modes and
// the production push environment, so company calls ring like normal calls, also on a locked phone.
// (Same iOS settings as Twilio's own config plugin, without its Android part, which waits for Firebase.)
const { withInfoPlist, withEntitlementsPlist } = require('expo/config-plugins');

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
  return config;
};
