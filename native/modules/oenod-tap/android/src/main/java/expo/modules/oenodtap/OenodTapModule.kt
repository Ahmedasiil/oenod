package expo.modules.oenodtap

import android.nfc.NfcAdapter
import android.content.pm.PackageManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class OenodTapModule : Module() {
  private val ctx get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("OenodTap")

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
