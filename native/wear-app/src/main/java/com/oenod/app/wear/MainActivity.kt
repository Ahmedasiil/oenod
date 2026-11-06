package com.oenod.app.wear

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.location.Location
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject
import java.text.DateFormat
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Currency
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.Executors

/** OENOD on Wear OS: pair with a code, then clock in or out, see the next shift and (managers) today's sales. */
class MainActivity : Activity() {
    private val io = Executors.newSingleThreadExecutor()
    private val ui = Handler(Looper.getMainLooper())
    private lateinit var col: LinearLayout
    private var poll: String? = null
    private var pollUntil = 0L
    private var busy = false
    private var today: JSONObject? = null
    private var error: String? = null

    private val NAVY = Color.parseColor("#000C58")
    private val BLUE = Color.parseColor("#3D5BF5")
    private val SKY = Color.parseColor("#AFC3FF")
    private val MIST = Color.parseColor("#9AA5C8")

    private val prefs by lazy { getSharedPreferences("oenod_watch", Context.MODE_PRIVATE) }
    private var token: String?
        get() = prefs.getString("token", null)
        set(v) { prefs.edit().apply { if (v == null) remove("token") else putString("token", v) }.apply() }

    override fun onCreate(s: Bundle?) {
        super.onCreate(s)
        val scroll = ScrollView(this).apply { setBackgroundColor(NAVY); isVerticalScrollBarEnabled = false }
        col = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER_HORIZONTAL
            val side = (resources.displayMetrics.widthPixels * 0.12).toInt()
            setPadding(side, (side * 1.2).toInt(), side, side * 2)
        }
        scroll.addView(col)
        setContentView(scroll)
        if (token == null) startPairing() else refresh()
    }

    override fun onResume() { super.onResume(); if (token != null) refresh() }

    // ---------- small view helpers ----------
    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
    private fun text(t: String, size: Float, color: Int = Color.WHITE, bold: Boolean = false, center: Boolean = true) =
        TextView(this).apply {
            text = t; textSize = size; setTextColor(color); if (bold) typeface = Typeface.DEFAULT_BOLD
            gravity = if (center) Gravity.CENTER else Gravity.START
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(4) }
        }
    private fun button(t: String, bg: Int, fg: Int, onClick: () -> Unit) = TextView(this).apply {
        text = t; textSize = 15f; setTextColor(fg); typeface = Typeface.DEFAULT_BOLD; gravity = Gravity.CENTER
        background = GradientDrawable().apply { cornerRadius = dp(24).toFloat(); setColor(bg) }
        setPadding(dp(12), dp(12), dp(12), dp(12))
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) }
        isClickable = true; setOnClickListener { onClick() }
    }
    private fun box(vararg views: View) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        background = GradientDrawable().apply { cornerRadius = dp(14).toFloat(); setColor(Color.argb(26, 255, 255, 255)) }
        setPadding(dp(10), dp(8), dp(10), dp(10))
        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(10) }
        views.forEach { addView(it) }
    }
    private fun buzz(ok: Boolean) {
        (getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createPredefined(if (ok) VibrationEffect.EFFECT_CLICK else VibrationEffect.EFFECT_DOUBLE_CLICK))
    }
    private fun bg(work: () -> Unit) = io.execute { try { work() } catch (e: Exception) { ui.post { error = e.message; render() } } }

    // ---------- pairing ----------
    private fun startPairing() {
        error = null
        renderPair(null)
        bg {
            val r = Api.call("POST", "/api/watch/start", JSONObject().put("platform", "wearos"))
            poll = r.getString("poll"); pollUntil = System.currentTimeMillis() + r.optLong("expires_in", 600) * 1000
            ui.post { renderPair(r.getString("code")); ui.postDelayed(::checkLink, 3000) }
        }
    }

    private fun checkLink() {
        val p = poll ?: return
        if (System.currentTimeMillis() > pollUntil) { poll = null; error = "The code expired. Tap to get a new one."; renderPair(null); return }
        io.execute {
            try {
                val r = Api.call("POST", "/api/watch/claim", JSONObject().put("poll", p).put("name", "Wear OS watch"))
                if (r.optBoolean("linked") && r.has("token")) {
                    token = r.getString("token"); poll = null
                    ui.post { buzz(true); refresh() }
                } else ui.postDelayed(::checkLink, 3000)
            } catch (e: ApiError) {
                if (e.status == 410) ui.post { poll = null; error = e.message; renderPair(null) } else ui.postDelayed(::checkLink, 3000)
            } catch (e: Exception) { ui.postDelayed(::checkLink, 5000) }
        }
    }

    private fun renderPair(code: String?) {
        col.removeAllViews()
        col.addView(text("OENOD", 20f, bold = true))
        if (code != null) {
            col.addView(text("Connect your watch", 13f, SKY))
            col.addView(box(text(code.substring(0, 3) + " " + code.substring(3), 28f, bold = true)))
            col.addView(text("On your phone, open OENOD, tap Me, then Connect a watch, and type this code.", 12f, MIST))
        } else {
            col.addView(text("Clock in, see your next shift and today's sales from your wrist.", 12f, MIST))
            error?.let { col.addView(text(it, 12f, Color.parseColor("#FFB15C"))) }
            col.addView(button("Get a code", BLUE, Color.WHITE) { startPairing() })
        }
    }

    // ---------- home ----------
    private fun refresh() {
        val t = token ?: return startPairing()
        bg {
            try {
                val r = Api.call("GET", "/api/watch/today", token = t)
                ui.post { today = r; error = null; render() }
            } catch (e: ApiError) {
                ui.post { if (e.status == 401) { token = null; error = e.message; renderPair(null) } else { error = e.message; render() } }
            }
        }
        ui.removeCallbacksAndMessages("tick"); ui.postAtTime({ refresh() }, "tick", android.os.SystemClock.uptimeMillis() + 60000)
    }

    private fun clock(action: String) {
        val t = token ?: return
        if (busy) return
        busy = true; render()
        val body = JSONObject().put("action", action)
        if (action == "in") lastLocation()?.let { body.put("lat", it.latitude).put("lng", it.longitude).put("accuracy", it.accuracy.toDouble()).put("location_status", "ok") }
        io.execute {
            try {
                val r = Api.call("POST", "/api/watch/clock", body, t)
                ui.post { busy = false; today = r; error = null; buzz(true); render() }
            } catch (e: Exception) { ui.post { busy = false; error = e.message; buzz(false); render() } }
        }
    }

    private fun lastLocation(): Location? {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 1)
            return null
        }
        val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
        return try {
            listOf(LocationManager.FUSED_PROVIDER, LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
                .mapNotNull { runCatching { lm.getLastKnownLocation(it) }.getOrNull() }
                .filter { System.currentTimeMillis() - it.time < 2 * 60 * 1000 }
                .minByOrNull { it.accuracy }
        } catch (e: SecurityException) { null }
    }

    private fun parse(s: String?): Date? = s?.let { runCatching { SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }.parse(it) }.getOrNull() }
    private fun time(s: String?, tz: String): String = parse(s)?.let { DateFormat.getTimeInstance(DateFormat.SHORT).apply { timeZone = TimeZone.getTimeZone(tz) }.format(it) } ?: ""
    private fun hm(m: Int) = "${m / 60}h ${"%02d".format(m % 60)}m"

    private fun render() {
        val t = today
        if (token == null) return renderPair(null)
        col.removeAllViews()
        if (t == null) { col.addView(text("OENOD", 20f, bold = true)); col.addView(text("Loading…", 13f, MIST)); error?.let { col.addView(text(it, 12f, Color.parseColor("#FFB15C"))) }; return }
        val tz = t.optString("timezone", TimeZone.getDefault().id)
        val first = t.optString("name").split(" ").firstOrNull() ?: ""
        col.addView(text("Hi, $first", 17f, bold = true))
        val c = t.optJSONObject("clock")
        if (c != null) {
            val isIn = c.optBoolean("in")
            col.addView(text(if (isIn) (if (c.optBoolean("on_break")) "On a break" else "Clocked in since ${time(c.optString("since"), tz)}") else "Not clocked in", 13f, if (isIn) Color.parseColor("#34D399") else MIST))
            col.addView(button(if (busy) "…" else if (isIn) "Clock out" else "Clock in", if (isIn) Color.WHITE else BLUE, if (isIn) NAVY else Color.WHITE) { clock(if (isIn) "out" else "in") })
            col.addView(text("Today: ${hm(c.optInt("today_minutes") + if (isIn) c.optInt("open_minutes") else 0)}", 12f, MIST))
            c.optJSONObject("next_shift")?.let { n ->
                val sub = listOf(n.optString("role"), n.optString("location")).filter { it.isNotBlank() && it != "null" }.joinToString(" · ")
                col.addView(box(text("Next shift", 11f, SKY, center = false), text("${time(n.optString("starts_at"), tz)} to ${time(n.optString("ends_at"), tz)}", 14f, bold = true, center = false), text(sub, 11f, MIST, center = false)))
            }
        } else col.addView(text("Your account has no time clock. Ask your manager to add you to the team.", 12f, MIST))
        t.optJSONObject("sales")?.let { s ->
            val f = NumberFormat.getCurrencyInstance().apply { runCatching { currency = Currency.getInstance(t.optString("currency", "CAD")) }; maximumFractionDigits = 0 }
            col.addView(box(text("Today's sales", 11f, SKY, center = false), text(f.format(s.optDouble("today")), 22f, bold = true, center = false),
                text("${s.optInt("orders")} orders · ${s.optInt("working")} working now", 11f, MIST, center = false)))
        }
        error?.let { col.addView(text(it, 12f, Color.parseColor("#FFB15C"))) }
        col.addView(button("Disconnect", Color.argb(30, 255, 255, 255), Color.WHITE) { token = null; today = null; startPairing() })
        col.addView(text("Powered by OENOD · Proudly Canadian", 9f, MIST))
    }
}
