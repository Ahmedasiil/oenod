import ActivityKit
import SwiftUI
import WidgetKit

// OENOD 3.9: the live shift. Lock screen banner + Dynamic Island (compact, minimal, expanded).
// The timer is drawn by iOS (Text(timerInterval:)), so it ticks every second with no updates.

private let navy = Color(red: 0, green: 12 / 255, blue: 88 / 255)
private let sky = Color(red: 185 / 255, green: 196 / 255, blue: 1)
private let green = Color(red: 18 / 255, green: 193 / 255, blue: 99 / 255)
private let amber = Color(red: 245 / 255, green: 165 / 255, blue: 36 / 255)

@main
struct OENODWidgets: WidgetBundle {
  var body: some Widget { ShiftLive() }
}

private struct Clock: View {
  let s: ShiftAttributes.ContentState
  var body: some View {
    let from = s.breakSince ?? s.since
    Text(timerInterval: from...Date.distantFuture, countsDown: false)
      .monospacedDigit()
  }
}

private struct Dot: View {
  let onBreak: Bool
  var body: some View { Circle().fill(onBreak ? amber : green).frame(width: 8, height: 8) }
}

struct ShiftLive: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: ShiftAttributes.self) { ctx in
      // Lock screen and notification banner.
      let s = ctx.state
      HStack(spacing: 14) {
        ZStack {
          RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.12)).frame(width: 44, height: 44)
          Image(systemName: s.breakSince == nil ? "clock.fill" : "cup.and.saucer.fill").foregroundColor(.white)
        }
        VStack(alignment: .leading, spacing: 2) {
          HStack(spacing: 6) { Dot(onBreak: s.breakSince != nil); Text(s.breakSince == nil ? s.label : s.breakLabel).font(.caption).foregroundColor(sky) }
          Clock(s: s).font(.system(size: 30, weight: .bold, design: .rounded)).foregroundColor(.white)
        }
        Spacer()
        Text(ctx.attributes.site).font(.caption).foregroundColor(sky).lineLimit(2).multilineTextAlignment(.trailing)
      }
      .padding(16)
      .activityBackgroundTint(navy)
      .activitySystemActionForegroundColor(.white)
      .widgetURL(URL(string: "oenod:///"))
    } dynamicIsland: { ctx in
      let s = ctx.state
      return DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          HStack(spacing: 6) { Dot(onBreak: s.breakSince != nil); Text(s.breakSince == nil ? s.label : s.breakLabel).font(.caption).foregroundColor(sky) }
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(ctx.attributes.site).font(.caption).foregroundColor(sky).lineLimit(1)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Clock(s: s).font(.system(size: 34, weight: .bold, design: .rounded)).foregroundColor(.white).frame(maxWidth: .infinity, alignment: .leading)
        }
      } compactLeading: {
        HStack(spacing: 4) { Dot(onBreak: s.breakSince != nil); Text("OENOD").font(.caption2).bold().foregroundColor(.white) }
      } compactTrailing: {
        Clock(s: s).font(.caption).foregroundColor(s.breakSince == nil ? green : amber).frame(maxWidth: 56)
      } minimal: {
        Dot(onBreak: s.breakSince != nil)
      }
      .widgetURL(URL(string: "oenod:///"))
      .keylineTint(sky)
    }
  }
}
