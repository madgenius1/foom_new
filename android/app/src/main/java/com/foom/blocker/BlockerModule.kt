package com.foom.blocker

import android.content.Intent
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * Native module for app blocking functionality
 */
class BlockerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private var instance: BlockerModule? = null

        fun sendUnlockRequest(packageName: String) {
            instance?.sendEventToJS("onUnlockRequest", packageName)
        }
    }

    init {
        instance = this
    }

    override fun getName(): String {
        return "BlockerModule"
    }

    /**
     * Update the list of locked apps
     */
    @ReactMethod
    fun updateLockedApps(packageNames: ReadableArray, promise: Promise) {
        try {
            val apps = mutableSetOf<String>()
            for (i in 0 until packageNames.size()) {
                packageNames.getString(i)?.let { apps.add(it) }
            }
            AppBlockService.updateLockedApps(apps)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("UPDATE_ERROR", "Failed to update locked apps", e)
        }
    }

    /**
     * Check if an app is currently blocked
     */
    @ReactMethod
    fun checkBlockStatus(packageName: String, promise: Promise) {
        try {
            val isBlocked = AppBlockService.getLockedApps().contains(packageName)
            promise.resolve(isBlocked)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check block status", e)
        }
    }

    /**
     * Open accessibility settings
     */
    @ReactMethod
    fun openAccessibilitySettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SETTINGS_ERROR", "Failed to open accessibility settings", e)
        }
    }

    /**
     * Check if accessibility service is enabled
     */
    @ReactMethod
    fun isAccessibilityEnabled(promise: Promise) {
        try {
            val enabled = isAccessibilityServiceEnabled()
            promise.resolve(enabled)
        } catch (e: Exception) {
            promise.reject("CHECK_ERROR", "Failed to check accessibility status", e)
        }
    }

    /**
     * Send event to JavaScript
     */
    private fun sendEventToJS(eventName: String, data: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    /**
     * Check if accessibility service is enabled
     */
    private fun isAccessibilityServiceEnabled(): Boolean {
        val expectedServiceName = "${reactContext.packageName}/${AppBlockService::class.java.canonicalName}"
        val enabledServices = Settings.Secure.getString(
            reactContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        )
        return enabledServices?.contains(expectedServiceName) == true
    }
}