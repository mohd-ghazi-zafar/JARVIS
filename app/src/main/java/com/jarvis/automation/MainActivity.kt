package com.jarvis.automation

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var tvServiceStatus: TextView
    private lateinit var tvServerStatus: TextView
    private lateinit var tvTtsStatus: TextView
    private lateinit var btnAccessibilitySettings: Button

    private val uiScope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private var statusJob: Job? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvServiceStatus = findViewById(R.id.tvServiceStatus)
        tvServerStatus = findViewById(R.id.tvServerStatus)
        tvTtsStatus = findViewById(R.id.tvTtsStatus)
        btnAccessibilitySettings = findViewById(R.id.btnAccessibilitySettings)

        btnAccessibilitySettings.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }
    }

    override fun onStart() {
        super.onStart()
        statusJob = uiScope.launch {
            JarvisAccessibilityService.status.collect { bridgeStatus ->
                renderStatus(bridgeStatus)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        renderStatus(JarvisAccessibilityService.status.value)
    }

    override fun onStop() {
        super.onStop()
        statusJob?.cancel()
        statusJob = null
    }

    override fun onDestroy() {
        super.onDestroy()
        uiScope.cancel()
    }

    private fun renderStatus(bridgeStatus: BridgeStatus) {
        val enabledInSystem = isAccessibilityServiceEnabled()
        val active = bridgeStatus.serviceConnected || enabledInSystem
        val address = "${JarvisAccessibilityService.SERVER_HOST}:${JarvisAccessibilityService.SERVER_PORT}"

        tvServiceStatus.text = if (active) {
            "Accessibility Service: Active"
        } else {
            "Accessibility Service: Inactive"
        }

        tvServerStatus.text = when {
            bridgeStatus.serverRunning -> "Local IPC Server: Running on http://$address"
            bridgeStatus.error != null -> "Local IPC Server: Error (${bridgeStatus.error}) on $address"
            else -> "Local IPC Server: Stopped ($address)"
        }

        tvTtsStatus.text = when {
            bridgeStatus.ttsReady -> "TextToSpeech: Ready"
            bridgeStatus.serviceConnected -> "TextToSpeech: Initializing"
            else -> "TextToSpeech: Inactive"
        }

        btnAccessibilitySettings.isEnabled = !active
        btnAccessibilitySettings.text = if (active) {
            "Accessibility Service Active"
        } else {
            "Enable Accessibility Service"
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val manager = getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            ?: return false
        val enabledServices = manager.getEnabledAccessibilityServiceList(
            AccessibilityServiceInfo.FEEDBACK_ALL_MASK
        )
        return enabledServices.any { info ->
            val serviceInfo = info.resolveInfo?.serviceInfo ?: return@any false
            serviceInfo.packageName == packageName &&
                serviceInfo.name == JarvisAccessibilityService::class.java.name
        }
    }
}
