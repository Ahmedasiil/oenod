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
      if (!f.exists()) return@Function null
      val t = try { f.readText().take(12000) } catch (e: Exception) { null }
      f.delete()
      t
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
