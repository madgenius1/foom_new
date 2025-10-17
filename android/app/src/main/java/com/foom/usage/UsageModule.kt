package com.foom.usage

import android.app.AppOpsManager
import android.app.usage.UsageStats
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.provider.Settings
import com.facebook.react.bridge.*
import java.util.concurrent.TimeUnit

/**
 * Native module for accessing Android UsageStatsManager
 */
class UsageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "UsageModule"
    }

    /**
     * Request usage access permission
     * Opens the system settings page
     */
    @ReactMethod
    fun requestUsagePermission(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("PERMISSION_ERROR", "Failed to open usage settings", e)
        }
    }

    /**
     * Check if usage permission is granted
     */
    @ReactMethod
    fun hasUsagePermission(promise: Promise) {
        try {
            val granted = checkUsagePermission()
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("PERMISSION_CHECK_ERROR", "Failed to check permission", e)
        }
    }

    /**
     * Get usage statistics for a time range
     * @param startMillis Start time in milliseconds
     * @param endMillis End time in milliseconds
     * @return Array of usage stats
     */
    @ReactMethod
    fun getUsageStats(startMillis: Double, endMillis: Double, promise: Promise) {
        try {
            if (!checkUsagePermission()) {
                promise.reject("PERMISSION_DENIED", "Usage permission not granted")
                return
            }

            val usageStatsManager = reactApplicationContext
                .getSystemService(Context.USAGE_STATS_MANAGER_SERVICE) as UsageStatsManager

            val usageStatsList = usageStatsManager.queryUsageStats(
                UsageStatsManager.INTERVAL_DAILY,
                startMillis.toLong(),
                endMillis.toLong()
            )

            val result = WritableNativeArray()
            val packageManager = reactApplicationContext.packageManager

            for (usageStats in usageStatsList) {
                if (usageStats.totalTimeInForeground > 0) {
                    val map = WritableNativeMap()
                    map.putString("packageName", usageStats.packageName)
                    
                    // Get app name
                    val appName = try {
                        val appInfo = packageManager.getApplicationInfo(
                            usageStats.packageName,
                            0
                        )
                        packageManager.getApplicationLabel(appInfo).toString()
                    } catch (e: PackageManager.NameNotFoundException) {
                        usageStats.packageName
                    }
                    map.putString("appName", appName)

                    // Convert to minutes
                    val minutes = TimeUnit.MILLISECONDS.toMinutes(usageStats.totalTimeInForeground)
                    map.putInt("minutes", minutes.toInt())
                    map.putDouble("lastUsed", usageStats.lastTimeUsed.toDouble())

                    result.pushMap(map)
                }
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("USAGE_STATS_ERROR", "Failed to get usage stats", e)
        }
    }

    /**
     * Get list of installed apps
     */
    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val packageManager = reactApplicationContext.packageManager
            val packages = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)
            
            val result = WritableNativeArray()

            for (packageInfo in packages) {
                // Filter out system apps (optional)
                if ((packageInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0) {
                    val map = WritableNativeMap()
                    map.putString("packageName", packageInfo.packageName)
val appName = packageManager.getApplicationLabel(packageInfo).toString()
map.putString("appName", appName)
result.pushMap(map)
}
}
promise.resolve(result)
    } catch (e: Exception) {
        promise.reject("GET_APPS_ERROR", "Failed to get installed apps", e)
    }
}

/**
 * Check if usage access permission is granted
 */
private fun checkUsagePermission(): Boolean {
    val appOps = reactApplicationContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactApplicationContext.packageName
    )
    return mode == AppOpsManager.MODE_ALLOWED
} 
}