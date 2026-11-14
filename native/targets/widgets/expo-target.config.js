/** 3.9: the live shift on the lock screen and in the Dynamic Island (Live Activity). */
/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'OENODWidgets',
  displayName: 'OENOD',
  bundleIdentifier: '.widgets',
  deploymentTarget: '16.2',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
  colors: { $accent: '#3D5BF5', $widgetBackground: '#000C58' },
};
