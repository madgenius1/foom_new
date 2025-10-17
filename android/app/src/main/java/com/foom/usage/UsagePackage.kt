package com.foom.usage

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * Package for registering UsageModule
 */
class UsagePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(UsageModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
````

### android/app/src/main/java/com/foom/blocker/AppBlockService.kt
````kotlin
package com.foom.blocker

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * Accessibility service for blocking apps
 */
class AppBlockService : AccessibilityService() {

    companion object {
        private const val TAG = "AppBlockService"
        private val lockedApps = mutableSetOf<String>()
        
        fun updateLockedApps(apps: Set<String>) {
            synchronized(lockedApps) {
                lockedApps.clear()
                lockedApps.addAll(apps)
            }
            Log.d(TAG, "Updated locked apps: $lockedApps")
        }

        fun getLockedApps(): Set<String> {
            synchronized(lockedApps) {
                return lockedApps.toSet()
            }
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event?.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString() ?: return
            
            // Check if this app is locked
            synchronized(lockedApps) {
                if (lockedApps.contains(packageName)) {
                    Log.d(TAG, "Blocked app launched: $packageName")
                    showBlockOverlay(packageName)
                }
            }
        }
    }

    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "Accessibility service connected")
    }

    private fun showBlockOverlay(packageName: String) {
        try {
            val intent = Intent(this, BlockedOverlayActivity::class.java)
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            intent.putExtra("packageName", packageName)
            startActivity(intent)
            
            // Go back to home screen
            performGlobalAction(GLOBAL_ACTION_HOME)
        } catch (e: Exception) {
            Log.e(TAG, "Error showing block overlay", e)
        }
    }
}