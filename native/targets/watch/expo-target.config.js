/** OENOD for Apple Watch: clock in and out, next shift, today's sales. Paired with a 6-digit code. */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'watch',
  name: 'OENODWatch',
  displayName: 'OENOD',
  bundleIdentifier: '.watchkitapp',
  deploymentTarget: '10.0',
  icon: '../../assets/icon.png',
  colors: { $accent: '#3D5BF5' },
};
