import Foundation
#if canImport(ActivityKit)
import ActivityKit

/// The live shift shown on the lock screen and in the Dynamic Island.
/// Keep this identical to targets/widgets/ShiftAttributes.swift: iOS matches the two by name.
@available(iOS 16.1, *)
public struct ShiftAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Clock-in time moved later by the break minutes already taken, so a plain timer shows time worked.
    public var since: Date
    /// When the current break started, or nil while working.
    public var breakSince: Date?
    public var label: String
    public var breakLabel: String
  }
  public var site: String
}
#endif
