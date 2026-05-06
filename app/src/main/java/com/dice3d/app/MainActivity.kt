package com.dice3d.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.content.res.Configuration
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.webkit.WebSettingsCompat
import androidx.webkit.WebViewFeature

class MainActivity : AppCompatActivity(), SensorEventListener {

    companion object {
        private const val TAG = "MainActivity"
        private const val SENSOR_REFRESH_INTERVAL_US = 10000
    }

    private lateinit var webView: WebView
    private lateinit var diceBridge: DiceBridge
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var gyroscope: Sensor? = null
    private var isSensorRegistered = false

    private val sensorPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            registerSensorListeners()
        }
        webView.evaluateJavascript(
            "if(typeof onSensorPermissionResult==='function'){onSensorPermissionResult($granted);}",
            null
        )
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        diceBridge = DiceBridge(this)
        webView.addJavascriptInterface(diceBridge, "DiceBridge")

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        settings.renderPriority = WebSettings.RenderPriority.HIGH
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        settings.databaseEnabled = true

        if (WebViewFeature.isFeatureSupported(WebViewFeature.SAFE_BROWSING_ENABLE)) {
            WebSettingsCompat.setSafeBrowsingEnabled(settings, true)
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return true
                if (url.startsWith("file:///android_asset/")) {
                    return false
                }
                return true
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
                Log.d(
                    TAG,
                    "[JS] ${consoleMessage.message()} -- ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}"
                )
                return true
            }
        }

        val onBackPressedCallback = object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        }
        onBackPressedDispatcher.addCallback(this, onBackPressedCallback)

        sensorManager = getSystemService(SENSOR_SERVICE) as? SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        gyroscope = sensorManager?.getDefaultSensor(Sensor.TYPE_GYROSCOPE)

        requestHighSamplingRatePermission()
        applyDarkModeToWebView()
        updateSystemBars()

        webView.loadUrl("file:///android_asset/index.html")
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        val isDark = (newConfig.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
                Configuration.UI_MODE_NIGHT_YES
        webView.evaluateJavascript(
            "if(typeof onThemeChanged==='function'){onThemeChanged(${isDark});}",
            null
        )
        updateSystemBars()
    }

    override fun onResume() {
        super.onResume()
        registerSensorListeners()
        webView.onResume()
    }

    override fun onPause() {
        super.onPause()
        unregisterSensorListeners()
        webView.onPause()
    }

    override fun onDestroy() {
        unregisterSensorListeners()
        webView.destroy()
        super.onDestroy()
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (!isSensorRegistered) return
        val values = event.values
        val js = when (event.sensor.type) {
            Sensor.TYPE_ACCELEROMETER -> {
                val x = values[0]
                val y = values[1]
                val z = values[2]
                "if(typeof onAccelerometer==='function'){onAccelerometer($x,$y,$z);}"
            }
            Sensor.TYPE_GYROSCOPE -> {
                val x = values[0]
                val y = values[1]
                val z = values[2]
                "if(typeof onGyroscope==='function'){onGyroscope($x,$y,$z);}"
            }
            else -> return
        }
        webView.evaluateJavascript(js, null)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    fun registerSensorListeners() {
        if (isSensorRegistered) return
        val sm = sensorManager ?: return
        accelerometer?.let {
            sm.registerListener(this, it, SENSOR_REFRESH_INTERVAL_US)
            isSensorRegistered = true
        }
        gyroscope?.let {
            sm.registerListener(this, it, SENSOR_REFRESH_INTERVAL_US)
        }
    }

    fun unregisterSensorListeners() {
        if (!isSensorRegistered) return
        sensorManager?.unregisterListener(this)
        isSensorRegistered = false
    }

    fun requestHighSamplingRatePermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(
                    this,
                    Manifest.permission.HIGH_SAMPLING_RATE_SENSORS
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                sensorPermissionLauncher.launch(Manifest.permission.HIGH_SAMPLING_RATE_SENSORS)
            } else {
                registerSensorListeners()
            }
        } else {
            registerSensorListeners()
        }
    }

    fun requestSensorPermissionFromBridge() {
        runOnUiThread {
            requestHighSamplingRatePermission()
        }
    }

    private fun applyDarkModeToWebView() {
        val isDark = ThemeHelper.getSystemDarkMode(this)
        if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK) && Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            val darkStrategy = if (isDark) WebSettingsCompat.FORCE_DARK_ON else WebSettingsCompat.FORCE_DARK_OFF
            WebSettingsCompat.setForceDark(webView.settings, darkStrategy)
        }
    }

    private fun updateSystemBars() {
        val isDark = ThemeHelper.getSystemDarkMode(this)
        ThemeHelper.updateSystemBars(isDark, this)
    }

    fun notifyThemeChanged() {
        runOnUiThread {
            applyDarkModeToWebView()
            updateSystemBars()
            val isDark = ThemeHelper.getSystemDarkMode(this)
            webView.evaluateJavascript(
                "if(typeof onThemeChanged==='function'){onThemeChanged(${isDark});}",
                null
            )
        }
    }
}
