import ExpoModulesCore
#if canImport(ActivityKit)
import ActivityKit
#endif

/// Starts, updates and ends the live shift Live Activity. The phone draws the ticking timer itself,
/// so nothing needs to run in the background and no push is needed.
public class OenodLiveModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OenodLive")

    Function("supported") { () -> Bool in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) { return ActivityAuthorizationInfo().areActivitiesEnabled }
      #endif
      return false
    }

    /// since / breakSince are seconds since 1970. breakSince 0 means working.
    AsyncFunction("show") { (site: String, since: Double, breakSince: Double, label: String, breakLabel: String) in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        let state = ShiftAttributes.ContentState(
          since: Date(timeIntervalSince1970: since),
          breakSince: breakSince > 0 ? Date(timeIntervalSince1970: breakSince) : nil,
          label: label, breakLabel: breakLabel)
        let content = ActivityContent(state: state, staleDate: nil)
        if let a = Activity<ShiftAttributes>.activities.first {
          await a.update(content)
          return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return }
        _ = try? Activity.request(attributes: ShiftAttributes(site: site), content: content, pushType: nil)
      }
      #endif
    }

    AsyncFunction("end") { () in
      #if canImport(ActivityKit)
      if #available(iOS 16.2, *) {
        for a in Activity<ShiftAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
      }
      #endif
    }
  }
}
