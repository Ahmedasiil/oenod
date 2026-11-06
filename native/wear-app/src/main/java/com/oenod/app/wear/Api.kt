package com.oenod.app.wear

import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

class ApiError(val status: Int, message: String) : Exception(message)

/** Calls oenod.com with this watch's own key (header X-Watch-Token). Run off the main thread. */
object Api {
    private const val BASE = "https://oenod.com"

    fun call(method: String, path: String, body: JSONObject? = null, token: String? = null): JSONObject {
        val c = URL(BASE + path).openConnection() as HttpURLConnection
        c.requestMethod = method
        c.connectTimeout = 15000; c.readTimeout = 20000
        c.setRequestProperty("Accept", "application/json")
        c.setRequestProperty("X-OENOD-Lang", Locale.getDefault().language)
        if (token != null) c.setRequestProperty("X-Watch-Token", token)
        if (body != null) {
            c.doOutput = true
            c.setRequestProperty("Content-Type", "application/json")
            c.outputStream.use { it.write(body.toString().toByteArray()) }
        }
        val code = c.responseCode
        val text = (if (code in 200..299) c.inputStream else c.errorStream)?.bufferedReader()?.use { it.readText() } ?: ""
        c.disconnect()
        val json = try { JSONObject(text) } catch (e: Exception) { JSONObject() }
        if (code !in 200..299) throw ApiError(code, json.optString("error", "Could not reach OENOD. Try again."))
        return json
    }
}
