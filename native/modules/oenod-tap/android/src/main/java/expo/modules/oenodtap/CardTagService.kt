package expo.modules.oenodtap

import android.content.Context
import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * Tap to share: answers as an NFC Forum Type 4 tag whose only content is the
 * person's public business card link. It answers only while the card screen is
 * open in OENOD (the "on" flag), and only with an https://oenod.com link.
 */
class CardTagService : HostApduService() {
  private enum class File { NONE, CC, NDEF }
  private var selected = File.NONE
  private var appSelected = false

  override fun processCommandApdu(apdu: ByteArray, extras: Bundle?): ByteArray {
    val url = currentUrl(this) ?: return NOT_FOUND
    if (apdu.size < 4) return WRONG
    val ins = apdu[1].toInt() and 0xFF
    val p1 = apdu[2].toInt() and 0xFF
    when (ins) {
      0xA4 -> { // SELECT
        if (p1 == 0x04) { // by AID
          appSelected = apdu.size >= 12 && apdu.copyOfRange(5, 12).contentEquals(AID)
          selected = File.NONE
          return if (appSelected) OK else NOT_FOUND
        }
        if (!appSelected || apdu.size < 7) return NOT_FOUND
        val id = ((apdu[5].toInt() and 0xFF) shl 8) or (apdu[6].toInt() and 0xFF)
        selected = when (id) { 0xE103 -> File.CC; 0xE104 -> File.NDEF; else -> File.NONE }
        return if (selected == File.NONE) NOT_FOUND else OK
      }
      0xB0 -> { // READ BINARY
        val data = when (selected) { File.CC -> CC; File.NDEF -> ndefFile(url); File.NONE -> return NOT_FOUND }
        val offset = ((apdu[2].toInt() and 0xFF) shl 8) or (apdu[3].toInt() and 0xFF)
        var le = if (apdu.size >= 5) apdu[4].toInt() and 0xFF else 0
        if (le == 0) le = 256
        if (offset >= data.size) return WRONG
        val end = minOf(data.size, offset + le)
        return data.copyOfRange(offset, end) + OK
      }
      0xD6 -> return DENIED // UPDATE BINARY: read only
    }
    return NOT_SUPPORTED
  }

  override fun onDeactivated(reason: Int) { selected = File.NONE; appSelected = false }

  companion object {
    private const val PREFS = "oenod_tap"
    private val AID = byteArrayOf(0xD2.toByte(), 0x76, 0x00, 0x00, 0x85.toByte(), 0x01, 0x01)
    private val OK = byteArrayOf(0x90.toByte(), 0x00)
    private val NOT_FOUND = byteArrayOf(0x6A, 0x82.toByte())
    private val WRONG = byteArrayOf(0x6B, 0x00)
    private val DENIED = byteArrayOf(0x69, 0x82.toByte())
    private val NOT_SUPPORTED = byteArrayOf(0x6D, 0x00)
    // Capability container: version 2.0, MLe 0x003B, MLc 0x0034, NDEF file E104, max 0x0400 bytes, read open, write denied.
    private val CC = byteArrayOf(0x00, 0x0F, 0x20, 0x00, 0x3B, 0x00, 0x34, 0x04, 0x06, 0xE1.toByte(), 0x04, 0x04, 0x00, 0x00, 0xFF.toByte())

    fun setUrl(ctx: Context, url: String?) {
      ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("url", url).apply()
    }

    /** The link to share, only if it is a public oenod.com link. */
    fun currentUrl(ctx: Context): String? {
      val u = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("url", null) ?: return null
      return if (u.startsWith("https://oenod.com/") && u.length <= 240) u else null
    }

    /** NDEF file: 2-byte length, then one short URI record (prefix 0x04 = "https://"). */
    fun ndefFile(url: String): ByteArray {
      val rest = url.removePrefix("https://").toByteArray(Charsets.UTF_8)
      val payload = byteArrayOf(0x04) + rest
      val record = byteArrayOf(0xD1.toByte(), 0x01, payload.size.toByte(), 0x55) + payload
      val n = record.size
      return byteArrayOf(((n shr 8) and 0xFF).toByte(), (n and 0xFF).toByte()) + record
    }
  }
}
