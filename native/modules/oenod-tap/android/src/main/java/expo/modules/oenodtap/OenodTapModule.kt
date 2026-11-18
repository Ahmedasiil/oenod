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

    /** 4.3.2: the sign-in cookie (oenod_sid) is a browser-session cookie, so Android forgets it whenever the app
        process ends (a crash, or the phone closing the app). The app keeps a copy in the secure store and puts it back. */
    Function("sessionCookie") {
      try {
        val all = android.webkit.CookieManager.getInstance().getCookie("https://oenod.com") ?: return@Function null
        all.split(";").map { it.trim() }.firstOrNull { it.startsWith("oenod_sid=") }?.substringAfter("=")
      } catch (e: Throwable) { null }
    }
    Function("restoreSession") { v: String ->
      if (!Regex("^[A-Za-z0-9,-]{20,128}$").matches(v)) return@Function false
      try {
        val cm = android.webkit.CookieManager.getInstance()
        val all = cm.getCookie("https://oenod.com") ?: ""
        if (all.contains("oenod_sid=")) return@Function false
        cm.setCookie("https://oenod.com", "oenod_sid=" + v + "; Path=/; Secure; HttpOnly; SameSite=Lax")
        cm.flush(); true
      } catch (e: Throwable) { false }
    }

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
      val b = ins.readBytes()
      if (e.reason == RN) sb.append(Tomb.summary(b)) else sb.append(String(b.copyOf(minOf(b.size, 9000)), Charsets.UTF_8))
    }
  } catch (x: Throwable) { sb.append("(trace unreadable: ").append(x.javaClass.simpleName).append(")") }
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

/** Reads the parts of an Android tombstone (protobuf) that say why: signal, abort message, cause, and the crashing
    thread's frames (library + function names only). */
object Tomb {
  private class R(val b: ByteArray, var p: Int = 0, val end: Int = b.size) {
    fun more() = p < end
    fun varint(): Long { var r = 0L; var s = 0; while (p < end) { val c = b[p++].toInt() and 0xff; r = r or ((c and 0x7f).toLong() shl s); if (c < 0x80) break; s += 7 }; return r }
    fun bytes(): R { val n = varint().toInt(); val r = R(b, p, minOf(end, p + n)); p = minOf(end, p + n); return r }
    fun str(): String { val r = bytes(); return String(b, r.p, r.end - r.p, Charsets.UTF_8) }
    fun skip(wt: Int) { when (wt) { 0 -> varint(); 1 -> p += 8; 2 -> bytes(); 5 -> p += 4; else -> p = end } }
  }
  fun summary(b: ByteArray): String {
    val out = StringBuilder(); var tid = -1L; var abort = ""; val threads = HashMap<Long, Pair<String, List<String>>>(); val sig = StringBuilder(); val causes = StringBuilder()
    val r = R(b)
    while (r.more()) {
      val k = r.varint(); val f = (k shr 3).toInt(); val wt = (k and 7).toInt()
      when {
        f == 6 && wt == 0 -> tid = r.varint()
        f == 14 && wt == 2 -> abort = r.str()
        f == 10 && wt == 2 -> { val s = r.bytes(); while (s.more()) { val k2 = s.varint(); val f2 = (k2 shr 3).toInt(); val w2 = (k2 and 7).toInt(); if ((f2 == 2 || f2 == 4) && w2 == 2) sig.append(s.str()).append(' ') else if (f2 == 1 && w2 == 0) sig.append("#").append(s.varint()).append(' ') else s.skip(w2) } }
        f == 15 && wt == 2 -> { val s = r.bytes(); while (s.more()) { val k2 = s.varint(); val w2 = (k2 and 7).toInt(); if ((k2 shr 3).toInt() == 1 && w2 == 2) causes.append(s.str()).append('\n') else s.skip(w2) } }
        f == 16 && wt == 2 -> { // map entry: 1 key, 2 Thread
          val en = r.bytes(); var key = -1L; var name = ""; val fr = ArrayList<String>()
          while (en.more()) { val k2 = en.varint(); val f2 = (k2 shr 3).toInt(); val w2 = (k2 and 7).toInt()
            if (f2 == 1 && w2 == 0) key = en.varint()
            else if (f2 == 2 && w2 == 2) { val th = en.bytes(); while (th.more()) { val k3 = th.varint(); val f3 = (k3 shr 3).toInt(); val w3 = (k3 and 7).toInt()
                if (f3 == 2 && w3 == 2) name = th.str()
                else if (f3 == 4 && w3 == 2 && fr.size < 40) { val bf = th.bytes(); var fn = ""; var file = ""; while (bf.more()) { val k4 = bf.varint(); val f4 = (k4 shr 3).toInt(); val w4 = (k4 and 7).toInt(); if (f4 == 4 && w4 == 2) fn = bf.str() else if (f4 == 6 && w4 == 2) file = bf.str() else bf.skip(w4) }
                  fr.add(file.substringAfterLast('/').substringAfterLast('!') + "  " + fn.take(160)) }
                else th.skip(w3) } }
            else en.skip(w2) }
          threads[key] = Pair(name, fr)
        }
        else -> r.skip(wt)
      }
    }
    out.append("Signal: ").append(sig).append("\nAbort: ").append(abort.take(1500)).append("\nCause: ").append(causes.toString().take(800))
    val t = threads[tid]
    out.append("\nCrashing thread ").append(tid).append(" ").append(t?.first ?: "?").append(":\n")
    t?.second?.forEach { out.append("  ").append(it).append('\n') }
    out.append("Threads: ").append(threads.values.joinToString(", ") { it.first }.take(1200))
    return out.toString()
  }
}
