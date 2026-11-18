package expo.modules.oenodtap

import android.nfc.NfcAdapter
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class OenodTapModule : Module() {
  private val ctx get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("OenodTap")

    // 4.3: if the app ever closes because of an error, keep the reason so the next start can send it to OENOD
    // support (no personal data: only the error and where in the code it happened).
    OnCreate {
      val app = appContext.reactContext?.applicationContext ?: return@OnCreate
      val f = File(app.filesDir, "oenod-last-crash.txt")
      val prev = Thread.getDefaultUncaughtExceptionHandler()
      if (prev !is CrashKeeper) Thread.setDefaultUncaughtExceptionHandler(CrashKeeper(f, prev))
    }

    /** The saved reason the app last closed, once (it is deleted after reading), or null. */
    Function("lastCrash") {
      val app = appContext.reactContext?.applicationContext ?: return@Function null
      val f = File(app.filesDir, "oenod-last-crash.txt")
      var t: String? = null
      if (f.exists()) { t = try { f.readText().take(12000) } catch (e: Exception) { null }; f.delete() }
      // 4.3.1: crashes deep in native code (the call or video engine) never reach the handler above, so also ask
      // Android how the app last ended. Each exit is reported once.
      if (t == null) t = try { lastExit(app) } catch (e: Throwable) { null }
      t
    }

    /** Saves the sign-in cookies to disk now, so a sudden close never signs the person out. */
    Function("flushCookies") { try { android.webkit.CookieManager.getInstance().flush() } catch (e: Throwable) { } }

    /** "none" (no NFC), "off" (NFC turned off in settings) or "ready". */
    Function("status") {
      val pm = ctx.packageManager
      if (!pm.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)) return@Function "none"
      val nfc = NfcAdapter.getDefaultAdapter(ctx) ?: return@Function "none"
      if (nfc.isEnabled) "ready" else "off"
    }

    /** Start sharing this link by tap. Only https://oenod.com links are accepted. */
    Function("start") { url: String ->
      if (!url.startsWith("https://oenod.com/") || url.length > 240) return@Function false
      CardTagService.setUrl(ctx, url)
      true
    }

    /** Stop sharing (called when the card screen closes). */
    Function("stop") { CardTagService.setUrl(ctx, null) }
  }
}

/** The newest crash, native crash or "not responding" exit Android recorded that was not reported yet, or null. */
fun lastExit(app: android.content.Context): String? {
  if (android.os.Build.VERSION.SDK_INT < 30) return null
  val am = app.getSystemService(android.content.Context.ACTIVITY_SERVICE) as android.app.ActivityManager
  val prefs = app.getSharedPreferences("oenod-exit", android.content.Context.MODE_PRIVATE)
  val seen = prefs.getLong("t", 0L)
  val list = am.getHistoricalProcessExitReasons(null, 0, 5)
  val R = android.app.ApplicationExitInfo.REASON_CRASH; val RN = android.app.ApplicationExitInfo.REASON_CRASH_NATIVE; val RA = android.app.ApplicationExitInfo.REASON_ANR
  if (list.isNotEmpty()) prefs.edit().putLong("t", list.first().timestamp).apply()
  val e = list.firstOrNull { it.timestamp > seen && (it.reason == R || it.reason == RN || it.reason == RA) } ?: return null
  val kind = when (e.reason) { RN -> "native crash"; RA -> "not responding (ANR)"; else -> "crash" }
  val sb = StringBuilder()
  sb.append("Android ").append(android.os.Build.VERSION.RELEASE).append(" (API ").append(android.os.Build.VERSION.SDK_INT).append(") ").append(android.os.Build.MODEL)
  sb.append("\nExit: ").append(kind).append(" at ").append(java.util.Date(e.timestamp)).append("\nDescription: ").append(e.description ?: "").append("\nProcess: ").append(e.processName).append(" status ").append(e.status).append("\n")
  try {
    e.traceInputStream?.use { ins ->
      val b = ins.readBytes().let { if (it.size > 400000) it.copyOf(400000) else it }
      // ANR traces are text; native tombstones are binary records: keep the readable parts (library and function names).
      val cur = StringBuilder(); val out = StringBuilder()
      for (x in b) { val c = x.toInt() and 0xff; if (c in 32..126) cur.append(c.toChar()) else { if (cur.length >= 6) out.append(cur).append('\n'); cur.setLength(0) }; if (out.length > 9000) break }
      sb.append(out)
    }
  } catch (x: Throwable) { }
  return sb.toString().take(11500)
}

/** Writes the error and thread name to a small file, then lets Android close the app as usual. */
class CrashKeeper(private val f: File, private val prev: Thread.UncaughtExceptionHandler?) : Thread.UncaughtExceptionHandler {
  override fun uncaughtException(t: Thread, e: Throwable) {
    try {
      val sw = java.io.StringWriter(); e.printStackTrace(java.io.PrintWriter(sw))
      f.writeText("Android " + android.os.Build.VERSION.RELEASE + " (API " + android.os.Build.VERSION.SDK_INT + ") " + android.os.Build.MODEL + "\nThread: " + t.name + "\n" + sw.toString().take(11000))
    } catch (x: Throwable) { /* nothing more we can do */ }
    prev?.uncaughtException(t, e)
  }
}
