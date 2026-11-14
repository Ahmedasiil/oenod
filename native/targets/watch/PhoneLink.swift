import Foundation
import WatchConnectivity

/// Sends the pairing code to the OENOD app on the paired iPhone, which then asks the person to tap Allow.
/// If the iPhone can't be reached right now, the code is queued and arrives when it can (the person can
/// still type the code by hand in the phone app).
final class PhoneLink: NSObject, WCSessionDelegate {
  static let shared = PhoneLink()
  private var waiting: String?

  func send(code: String) {
    guard WCSession.isSupported() else { return }
    let s = WCSession.default
    if s.delegate == nil { s.delegate = self }
    guard s.activationState == .activated else { waiting = code; s.activate(); return }
    deliver(code, s)
  }

  /// Connected: tell the phone the old code is finished, so it never offers it again.
  func done() {
    guard WCSession.isSupported(), WCSession.default.activationState == .activated else { return }
    try? WCSession.default.updateApplicationContext(["type": "done", "at": Date().timeIntervalSince1970])
  }

  private func deliver(_ code: String, _ s: WCSession) {
    let msg: [String: Any] = ["type": "pair", "code": code, "at": Date().timeIntervalSince1970]
    try? s.updateApplicationContext(msg) // read by the phone app the next time it opens
    if s.isReachable {
      s.sendMessage(msg, replyHandler: nil) { _ in s.transferUserInfo(msg) }
    } else {
      s.transferUserInfo(msg)
    }
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if activationState == .activated, let c = waiting { waiting = nil; deliver(c, session) }
  }
}
