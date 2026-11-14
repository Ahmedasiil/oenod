// Business Phone calls (Twilio Voice) are iPhone-only for now: Android needs OENOD's Firebase project
// (FCM) first. When google-services.json is in place, remove the android: null line below.
module.exports = {
  dependencies: {
    '@twilio/voice-react-native-sdk': { platforms: { android: null } },
  },
};
