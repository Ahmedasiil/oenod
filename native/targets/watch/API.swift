import Foundation
import Security

/// Talks to oenod.com with this watch's own key (kept in the watch Keychain).
struct WatchToday: Decodable {
  struct Shift: Decodable { let starts_at: String; let ends_at: String; let role: String?; let location: String? }
  struct Clock: Decodable { let `in`: Bool; let on_break: Bool; let since: String?; let open_minutes: Int; let today_minutes: Int; let next_shift: Shift? }
  struct Sales: Decodable { let today: Double; let orders: Int; let working: Int }
  let name: String
  let company: String?
  let currency: String
  let timezone: String
  let clock: Clock?
  let sales: Sales?
}

struct APIError: Error, LocalizedError {
  let status: Int
  let message: String
  var errorDescription: String? { message }
}

enum API {
  static let base = URL(string: "https://oenod.com")!

  static func call<T: Decodable>(_ method: String, _ path: String, body: [String: Any]? = nil, token: String? = nil) async throws -> T {
    var r = URLRequest(url: base.appendingPathComponent(path))
    r.httpMethod = method
    r.timeoutInterval = 20
    r.setValue("application/json", forHTTPHeaderField: "Accept")
    r.setValue(Locale.current.language.languageCode?.identifier ?? "en", forHTTPHeaderField: "X-OENOD-Lang")
    if let token { r.setValue(token, forHTTPHeaderField: "X-Watch-Token") }
    if let body {
      r.setValue("application/json", forHTTPHeaderField: "Content-Type")
      r.httpBody = try JSONSerialization.data(withJSONObject: body)
    }
    let (data, resp) = try await URLSession.shared.data(for: r)
    let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
    if !(200..<300).contains(status) {
      let msg = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
      throw APIError(status: status, message: msg ?? "Could not reach OENOD. Try again.")
    }
    return try JSONDecoder().decode(T.self, from: data)
  }
}

enum Keychain {
  static let account = "oenod.watch.token"
  static func save(_ v: String) {
    let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account]
    SecItemDelete(q as CFDictionary)
    var add = q
    add[kSecValueData as String] = Data(v.utf8)
    add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    SecItemAdd(add as CFDictionary, nil)
  }
  static func load() -> String? {
    let q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
    var out: AnyObject?
    guard SecItemCopyMatching(q as CFDictionary, &out) == errSecSuccess, let d = out as? Data else { return nil }
    return String(data: d, encoding: .utf8)
  }
  static func clear() {
    SecItemDelete([kSecClass as String: kSecClassGenericPassword, kSecAttrAccount as String: account] as CFDictionary)
  }
}
