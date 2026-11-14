import ExpoModulesCore
import WatchConnectivity

/// The OENOD Apple Watch app sends its 6-digit pairing code to this iPhone. The phone app then asks
/// the signed-in person "Connect this Apple Watch?" and links the code on oenod.com. No code typing.
public class OenodWatchLinkModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OenodWatchLink")
    Events("onPair")

    OnCreate {
      WatchLink.shared.onCode = { [weak self] code in self?.sendEvent("onPair", ["code": code]) }
      WatchLink.shared.start()
    }

    /// A code the watch sent in the last 10 minutes that the app has not shown yet (taken once).
    Function("pending") { () -> String? in
      return WatchLink.shared.takePending()
    }

    Function("status") { () -> [String: Bool] in
      guard WCSession.isSupported() else { return ["supported": false, "paired": false, "installed": false] }
      let s = WCSession.default
      return ["supported": true, "paired": s.isPaired, "installed": s.isWatchAppInstalled]
    }
  }
}

final class WatchLink: NSObject, WCSessionDelegate {
  static let shared = WatchLink()
  var onCode: ((String) -> Void)?
  private var pending: String?
  private var pendingAt = Date.distantPast

  func start() {
    guard WCSession.isSupported() else { return }
    let s = WCSession.default
    if s.delegate == nil { s.delegate = self }
    if s.activationState != .activated { s.activate() }
  }

  func takePending() -> String? {
    guard let p = pending, Date().timeIntervalSince(pendingAt) < 600 else { pending = nil; return nil }
    pending = nil
    return p
  }

  private var lastAt: Double = 0

  /// Only the newest code counts, and only while it can still work (codes last 10 minutes). The watch's
  /// last message stays stored on the phone, so an old code must never be offered again.
  private func handle(_ m: [String: Any]) {
    let at = (m["at"] as? Double) ?? 0
    DispatchQueue.main.async {
      guard at >= self.lastAt else { return }
      if (m["type"] as? String) == "done" { self.lastAt = at; self.pending = nil; return }
      guard (m["type"] as? String) == "pair", let c = m["code"] as? String,
            c.count == 6, c.allSatisfy({ $0.isASCII && $0.isNumber }),
            Date().timeIntervalSince1970 - at < 540 else { return }
      self.lastAt = at
      self.pending = c
      self.pendingAt = Date(timeIntervalSince1970: at)
      self.onCode?(c)
    }
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) { handle(message) }
  func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    handle(message)
    replyHandler(["ok": true])
  }
  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) { handle(userInfo) }
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated { handle(session.receivedApplicationContext) }
  }
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) { handle(applicationContext) }
  func sessionDidBecomeInactive(_ session: WCSession) {}
  func sessionDidDeactivate(_ session: WCSession) { session.activate() }
}
