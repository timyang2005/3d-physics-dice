package com.dice3d.app

import android.app.UiModeManager
import android.content.Context
import android.content.Context.MODE_PRIVATE
import android.content.res.Configuration
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.webkit.JavascriptInterface

class DiceBridge(private val activity: MainActivity) {

    companion object {
        private const val PREFS_NAME = "dice3d_prefs"
        private const val KEY_THEME_MODE = "theme_mode"
    }

    private val prefs by lazy {
        activity.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
    }

    @JavascriptInterface
    fun vibrate(duration: Int) {
        val vibrator = getVibrator() ?: return
        val safeDuration = duration.coerceIn(1, 1000)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    safeDuration.toLong(),
                    VibrationEffect.DEFAULT_AMPLITUDE
                )
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(safeDuration.toLong())
        }
    }

    @JavascriptInterface
    fun vibrateWithIntensity(duration: Int, intensity: Int) {
        val vibrator = getVibrator() ?: return
        val safeDuration = duration.coerceIn(1, 1000)
        val safeIntensity = intensity.coerceIn(1, 255)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(
                VibrationEffect.createOneShot(
                    safeDuration.toLong(),
                    safeIntensity
                )
            )
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(safeDuration.toLong())
        }
    }

    @JavascriptInterface
    fun cancelVibrate() {
        val vibrator = getVibrator() ?: return
        vibrator.cancel()
    }

    @JavascriptInterface
    fun isDarkMode(): Boolean {
        return ThemeHelper.getSystemDarkMode(activity)
    }

    @JavascriptInterface
    fun getThemeMode(): String {
        return prefs.getString(KEY_THEME_MODE, "system") ?: "system"
    }

    @JavascriptInterface
    fun setThemeMode(mode: String) {
        val validModes = setOf("system", "light", "dark")
        val safeMode = if (mode in validModes) mode else "system"
        prefs.edit().putString(KEY_THEME_MODE, safeMode).apply()
        activity.notifyThemeChanged()
    }

    @JavascriptInterface
    fun requestSensorPermission() {
        activity.requestSensorPermissionFromBridge()
    }

    @JavascriptInterface
    fun saveToStorage(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    @JavascriptInterface
    fun loadFromStorage(key: String): String {
        return prefs.getString(key, "") ?: ""
    }

    @JavascriptInterface
    fun hasGyroscope(): Boolean {
        val sensorManager = activity.getSystemService(Context.SENSOR_SERVICE) as? android.hardware.SensorManager
        return sensorManager?.getDefaultSensor(android.hardware.Sensor.TYPE_GYROSCOPE) != null
    }

    @Suppress("DEPRECATION")
    private fun getVibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }
}
