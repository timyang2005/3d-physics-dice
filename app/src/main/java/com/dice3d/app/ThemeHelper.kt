package com.dice3d.app

import android.app.Activity
import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.view.View
import android.view.WindowInsetsController

object ThemeHelper {

    fun getSystemDarkMode(context: Context): Boolean {
        val uiModeManager = context.getSystemService(Context.UI_MODE_SERVICE) as? UiModeManager
        return uiModeManager?.nightMode == UiModeManager.MODE_NIGHT_YES
    }

    fun applyThemeMode(mode: String, activity: Activity) {
        val isDark = when (mode) {
            "dark" -> true
            "light" -> false
            else -> getSystemDarkMode(activity)
        }
        updateSystemBars(isDark, activity)
    }

    fun updateSystemBars(isDark: Boolean, activity: Activity) {
        val window = activity.window
        val decorView = window.decorView

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val insetsController = decorView.windowInsetsController
            if (insetsController != null) {
                if (isDark) {
                    insetsController.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                    decorView.systemUiVisibility = decorView.systemUiVisibility or
                            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                } else {
                    insetsController.systemBarsBehavior =
                        WindowInsetsController.BEHAVIOR_DEFAULT
                }

                val appearance = if (isDark) {
                    0
                } else {
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                }
                insetsController.setSystemBarsAppearance(
                    appearance,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                            WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                )
            }
        } else {
            @Suppress("DEPRECATION")
            val flags = decorView.systemUiVisibility
            if (isDark) {
                @Suppress("DEPRECATION")
                decorView.systemUiVisibility = flags and
                        View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR.inv() and
                        View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR.inv()
            } else {
                @Suppress("DEPRECATION")
                decorView.systemUiVisibility = flags or
                        View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR or
                        View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            val statusBarColor = if (isDark) {
                0x00000000
            } else {
                0x00000000
            }
            window.statusBarColor = statusBarColor

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                window.navigationBarColor = if (isDark) {
                    0x00000000
                } else {
                    0x00000000
                }
            }
        }
    }
}
