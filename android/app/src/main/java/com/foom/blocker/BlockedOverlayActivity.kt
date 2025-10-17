package com.foom.blocker

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.foom.R

/**
 * Overlay activity shown when a locked app is launched
 */
class BlockedOverlayActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_blocked_overlay)

        val packageName = intent.getStringExtra("packageName") ?: ""
        
        val messageText = findViewById<TextView>(R.id.messageText)
        val unlockButton = findViewById<Button>(R.id.unlockButton)
        val closeButton = findViewById<Button>(R.id.closeButton)

        messageText.text = "This app is locked by FOOM.\nUnlock to use for 60 minutes."

        unlockButton.setOnClickListener {
            // Send event back to React Native to handle unlock
            BlockerModule.sendUnlockRequest(packageName)
            finish()
        }

        closeButton.setOnClickListener {
            finish()
        }
    }

    override fun onBackPressed() {
        // Prevent back button from bypassing the block
        finishAffinity()
    }
}