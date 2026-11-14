import SwiftUI

@main
struct OENODWatchApp: App {
  @StateObject private var model = WatchModel()
  @Environment(\.scenePhase) private var phase
  var body: some Scene {
    WindowGroup {
      Group {
        if model.token == nil { PairView() } else { HomeView() }
      }
      .environmentObject(model)
    }
    .onChange(of: phase) { _, p in
      // Back on screen (after typing the code on the phone): check right away instead of waiting.
      if p == .active, model.token == nil, model.code != nil { Task { await model.checkNow() } }
    }
  }
}

let navy = Color(red: 0, green: 12 / 255, blue: 88 / 255)
let brandBlue = Color(red: 61 / 255, green: 91 / 255, blue: 245 / 255)
let sky = Color(red: 175 / 255, green: 195 / 255, blue: 1)
let mist = Color(red: 154 / 255, green: 165 / 255, blue: 200 / 255)

@MainActor
final class WatchModel: ObservableObject {
  @Published var token: String? = Keychain.load()
  @Published var today: WatchToday?
  @Published var code: String?
  @Published var busy = false
  @Published var error: String?
  private var poll: String?
  private var pollTask: Task<Void, Never>?

  /// The code being paired survives the watch app closing (watchOS often closes it while the person is on
  /// the phone). Without this a relaunch made a new code, so the code typed or allowed on the phone never matched.
  private enum Saved {
    static let key = "oenod.watch.pair"
    static func load() -> (code: String, poll: String, until: Date)? {
      guard let d = UserDefaults.standard.dictionary(forKey: key), let c = d["code"] as? String, let p = d["poll"] as? String,
            let u = d["until"] as? Double, Date(timeIntervalSince1970: u) > Date().addingTimeInterval(20) else { return nil }
      return (c, p, Date(timeIntervalSince1970: u))
    }
    static func save(_ c: String, _ p: String, _ u: Date) { UserDefaults.standard.set(["code": c, "poll": p, "until": u.timeIntervalSince1970], forKey: key) }
    static func clear() { UserDefaults.standard.removeObject(forKey: key) }
  }

  init() {
    if token == nil, let s = Saved.load() {
      code = s.code; poll = s.poll
      pollTask = Task { await self.waitForLink(until: s.until, first: true) }
    }
  }

  // MARK: pairing
  func startPairing() {
    pollTask?.cancel()
    error = nil; code = nil
    Task {
      do {
        struct Start: Decodable { let code: String; let poll: String; let expires_in: Int }
        let s: Start = try await API.call("POST", "/api/watch/start", body: ["platform": "watchos"])
        let until = Date().addingTimeInterval(TimeInterval(s.expires_in))
        code = s.code; poll = s.poll; fails = 0
        Saved.save(s.code, s.poll, until)
        PhoneLink.shared.send(code: s.code)
        pollTask = Task { await self.waitForLink(until: until) }
      } catch { self.error = error.localizedDescription }
    }
  }

  private var fails = 0
  @Published var hint: String?

  private func waitForLink(until: Date, first: Bool = false) async {
    if first, await checkNow() { return }
    while !Task.isCancelled && Date() < until {
      try? await Task.sleep(nanoseconds: 2_000_000_000)
      if Task.isCancelled { return }
      if await checkNow() { return }
    }
    if !Task.isCancelled && token == nil { code = nil; poll = nil; Saved.clear(); error = String(localized: "The code expired. Tap to get a new one.") }
  }

  /// One look at the server: has the phone linked our code yet? True when connected (or the code is gone).
  @discardableResult
  func checkNow() async -> Bool {
    struct Claim: Decodable { let linked: Bool; let token: String? }
    guard let poll, token == nil else { return true }
    do {
      let c: Claim = try await API.call("POST", "/api/watch/claim", body: ["poll": poll, "name": "Apple Watch"])
      fails = 0; hint = nil
      if c.linked, let t = c.token {
        Keychain.save(t); token = t; code = nil; self.poll = nil
        Saved.clear(); PhoneLink.shared.done()
        pollTask?.cancel()
        WKHaptic.success()
        await refresh()
        return true
      }
      return false
    } catch let e as APIError where e.status == 410 {
      if token == nil { code = nil; error = e.message }
      self.poll = nil; Saved.clear(); return true
    } catch {
      // Offline for a moment: keep trying, but say so after a few misses so nobody waits blindly.
      fails += 1
      if fails >= 3 { hint = String(localized: "Can't reach OENOD. Check that your iPhone or Wi-Fi is connected.") + " (" + error.localizedDescription + ")" }
      return false
    }
  }

  // MARK: data
  func refresh() async {
    guard let token else { return }
    do { today = try await API.call("GET", "/api/watch/today", token: token); error = nil }
    catch let e as APIError where e.status == 401 { disconnect(); error = e.message }
    catch { self.error = error.localizedDescription }
  }

  func clock(_ action: String) async {
    guard let token, !busy else { return }
    busy = true; defer { busy = false }
    var body: [String: Any] = ["action": action]
    if action == "in", let l = await OneFix.fix() {
      body["lat"] = l.coordinate.latitude; body["lng"] = l.coordinate.longitude; body["accuracy"] = l.horizontalAccuracy
      body["location_status"] = "ok"
    }
    do {
      today = try await API.call("POST", "/api/watch/clock", body: body, token: token)
      error = nil
      WKHaptic.success()
    } catch {
      self.error = error.localizedDescription
      WKHaptic.failure()
    }
  }

  func disconnect() { Keychain.clear(); token = nil; today = nil }
}

import WatchKit
enum WKHaptic {
  static func success() { WKInterfaceDevice.current().play(.success) }
  static func failure() { WKInterfaceDevice.current().play(.failure) }
}

// MARK: - Formatting
enum Fmt {
  static func date(_ s: String) -> Date? {
    let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(identifier: "UTC")
    f.dateFormat = "yyyy-MM-dd HH:mm:ss"
    return f.date(from: s) ?? ISO8601DateFormatter().date(from: s)
  }
  static func time(_ s: String?, tz: String) -> String {
    guard let s, let d = date(s) else { return "" }
    let f = DateFormatter(); f.timeStyle = .short; f.dateStyle = .none; f.timeZone = TimeZone(identifier: tz) ?? .current
    return f.string(from: d)
  }
  static func day(_ s: String, tz: String) -> String {
    guard let d = date(s) else { return "" }
    var cal = Calendar.current; cal.timeZone = TimeZone(identifier: tz) ?? .current
    if cal.isDateInToday(d) { return String(localized: "Today") }
    if cal.isDateInTomorrow(d) { return String(localized: "Tomorrow") }
    let f = DateFormatter(); f.setLocalizedDateFormatFromTemplate("EEE d"); f.timeZone = cal.timeZone
    return f.string(from: d)
  }
  static func hm(_ m: Int) -> String { "\(m / 60)h \(String(format: "%02d", m % 60))m" }
  static func money(_ v: Double, _ cur: String) -> String {
    let f = NumberFormatter(); f.numberStyle = .currency; f.currencyCode = cur; f.maximumFractionDigits = 0
    return f.string(from: NSNumber(value: v)) ?? "\(Int(v))"
  }
}
