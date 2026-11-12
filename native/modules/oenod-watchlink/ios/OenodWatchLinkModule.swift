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

  private func handle(_ m: [String: Any]) {
    guard (m["type"] as? String) == "pair", let c = m["code"] as? String,
          c.count == 6, c.allSatisfy({ $0.isASCII && $0.isNumber }) else { return }
    DispatchQueue.main.async {
      self.pending = c
      self.pendingAt = Date()
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
