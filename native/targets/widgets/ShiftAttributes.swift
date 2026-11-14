import Foundation
#if canImport(ActivityKit)
import ActivityKit

/// The live shift shown on the lock screen and in the Dynamic Island.
/// Keep this identical to modules/oenod-live/ios/ShiftAttributes.swift: iOS matches the two by name.
@available(iOS 16.1, *)
struct ShiftAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    /// Clock-in time moved later by the break minutes already taken, so a plain timer shows time worked.
    var since: Date
    /// When the current break started, or nil while working.
    var breakSince: Date?
    var label: String
    var breakLabel: String
  }
  var site: String
}
#endif
