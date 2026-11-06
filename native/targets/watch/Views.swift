import SwiftUI

/// First run: shows the 6-digit code to type in the phone app.
struct PairView: View {
  @EnvironmentObject var m: WatchModel
  var body: some View {
    ScrollView {
      VStack(spacing: 8) {
        Text("OENOD").font(.system(size: 20, weight: .heavy)).foregroundStyle(.white)
        if let code = m.code {
          Text("Connect your watch").font(.footnote).foregroundStyle(sky)
          Text("\(String(code.prefix(3))) \(String(code.suffix(3)))")
            .font(.system(size: 30, weight: .bold, design: .rounded)).monospacedDigit().foregroundStyle(.white)
            .padding(.vertical, 6).frame(maxWidth: .infinity)
            .background(RoundedRectangle(cornerRadius: 14).fill(.white.opacity(0.10)))
          Text("On your phone, open OENOD, tap Me, then Connect a watch, and type this code.")
            .font(.caption2).foregroundStyle(mist).multilineTextAlignment(.center)
          ProgressView().padding(.top, 4)
        } else {
          Text("Clock in, see your next shift and today's sales from your wrist.")
            .font(.caption2).foregroundStyle(mist).multilineTextAlignment(.center)
          if let e = m.error { Text(e).font(.caption2).foregroundStyle(.orange).multilineTextAlignment(.center) }
          Button("Get a code") { m.startPairing() }.tint(brandBlue).buttonStyle(.borderedProminent)
        }
      }.padding(.horizontal, 4)
    }
    .containerBackground(navy.gradient, for: .navigation)
    .background(navy.ignoresSafeArea())
    .onAppear { if m.code == nil && m.error == nil { m.startPairing() } }
  }
}

struct HomeView: View {
  @EnvironmentObject var m: WatchModel
  var body: some View {
    TabView {
      ClockPage()
      if m.today?.sales != nil { SalesPage() }
      SettingsPage()
    }
    .tabViewStyle(.verticalPage)
    .task { await m.refresh() }
    .onReceive(Timer.publish(every: 60, on: .main, in: .common).autoconnect()) { _ in Task { await m.refresh() } }
  }
}

struct ClockPage: View {
  @EnvironmentObject var m: WatchModel
  var body: some View {
    let t = m.today
    let c = t?.clock
    let tz = t?.timezone ?? TimeZone.current.identifier
    ScrollView {
      VStack(alignment: .leading, spacing: 8) {
        Text(t.map { "Hi, \($0.name.split(separator: " ").first.map(String.init) ?? $0.name)" } ?? "OENOD")
          .font(.headline).foregroundStyle(.white)
        if let c {
          Text(c.in ? (c.on_break ? "On a break" : "Clocked in since \(Fmt.time(c.since, tz: tz))") : "Not clocked in")
            .font(.caption).foregroundStyle(c.in ? Color.green : mist)
          Button {
            Task { await m.clock(c.in ? "out" : "in") }
          } label: {
            HStack { if m.busy { ProgressView() } else { Image(systemName: c.in ? "stop.circle.fill" : "clock.fill") }
              Text(c.in ? "Clock out" : "Clock in").fontWeight(.bold) }
              .frame(maxWidth: .infinity)
          }
          .tint(c.in ? .white : brandBlue).foregroundStyle(c.in ? navy : .white)
          .buttonStyle(.borderedProminent).disabled(m.busy)
          Text("Today: \(Fmt.hm(c.today_minutes + (c.in ? c.open_minutes : 0)))").font(.caption2).foregroundStyle(mist)
          if let n = c.next_shift {
            VStack(alignment: .leading, spacing: 2) {
              Text("Next shift").font(.caption2).foregroundStyle(sky)
              Text("\(Fmt.day(n.starts_at, tz: tz)), \(Fmt.time(n.starts_at, tz: tz)) to \(Fmt.time(n.ends_at, tz: tz))").font(.footnote).foregroundStyle(.white)
              let r = [n.role, n.location].compactMap { $0 }.joined(separator: " · ")
              if !r.isEmpty { Text(r).font(.caption2).foregroundStyle(mist) }
            }
            .padding(8).frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 12).fill(.white.opacity(0.08)))
          }
        } else if t != nil {
          Text("Your account has no time clock. Ask your manager to add you to the team.").font(.caption2).foregroundStyle(mist)
        } else {
          ProgressView()
        }
        if let e = m.error { Text(e).font(.caption2).foregroundStyle(.orange) }
      }
    }
    .containerBackground(navy.gradient, for: .tabView)
  }
}

struct SalesPage: View {
  @EnvironmentObject var m: WatchModel
  var body: some View {
    let s = m.today?.sales
    VStack(alignment: .leading, spacing: 6) {
      Text("Today's sales").font(.caption).foregroundStyle(sky)
      Text(Fmt.money(s?.today ?? 0, m.today?.currency ?? "CAD"))
        .font(.system(size: 30, weight: .bold, design: .rounded)).minimumScaleFactor(0.6).lineLimit(1).foregroundStyle(.white)
      HStack {
        VStack(alignment: .leading) { Text("\(s?.orders ?? 0)").font(.headline).foregroundStyle(.white); Text("Orders").font(.caption2).foregroundStyle(mist) }
        Spacer()
        VStack(alignment: .leading) { Text("\(s?.working ?? 0)").font(.headline).foregroundStyle(.white); Text("Working now").font(.caption2).foregroundStyle(mist) }
      }
      if let c = m.today?.company { Text(c).font(.caption2).foregroundStyle(mist).lineLimit(1) }
    }
    .padding(.horizontal, 4)
    .containerBackground(navy.gradient, for: .tabView)
  }
}

struct SettingsPage: View {
  @EnvironmentObject var m: WatchModel
  @State private var ask = false
  var body: some View {
    VStack(spacing: 8) {
      Text("OENOD").font(.system(size: 18, weight: .heavy)).foregroundStyle(.white)
      if let n = m.today?.name { Text(n).font(.caption).foregroundStyle(mist) }
      Button("Refresh") { Task { await m.refresh() } }
      Button("Disconnect", role: .destructive) { ask = true }
      Text("Powered by OENOD · Proudly Canadian").font(.system(size: 9)).foregroundStyle(mist)
    }
    .confirmationDialog("Disconnect this watch?", isPresented: $ask) {
      Button("Disconnect", role: .destructive) { m.disconnect() }
    }
    .containerBackground(navy.gradient, for: .tabView)
  }
}
