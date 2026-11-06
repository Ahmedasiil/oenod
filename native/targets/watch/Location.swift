import CoreLocation

/// One position for clock-in (site attendance). Gives up after a few seconds; the server decides if it is needed.
final class OneFix: NSObject, CLLocationManagerDelegate {
  private let m = CLLocationManager()
  private var done: ((CLLocation?) -> Void)?

  func get(_ cb: @escaping (CLLocation?) -> Void) {
    done = cb
    m.delegate = self
    m.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
    switch m.authorizationStatus {
    case .notDetermined: m.requestWhenInUseAuthorization()
    case .denied, .restricted: finish(nil); return
    default: m.requestLocation()
    }
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in self?.finish(nil) }
  }
  func locationManagerDidChangeAuthorization(_ m: CLLocationManager) {
    switch m.authorizationStatus {
    case .authorizedWhenInUse, .authorizedAlways: m.requestLocation()
    case .denied, .restricted: finish(nil)
    default: break
    }
  }
  func locationManager(_ m: CLLocationManager, didUpdateLocations l: [CLLocation]) { finish(l.last) }
  func locationManager(_ m: CLLocationManager, didFailWithError error: Error) { finish(nil) }
  private func finish(_ l: CLLocation?) { if let d = done { done = nil; d(l) } }

  static func fix() async -> CLLocation? {
    await withCheckedContinuation { c in
      let f = OneFix()
      DispatchQueue.main.async { f.get { l in _ = f; c.resume(returning: l) } }
    }
  }
}
