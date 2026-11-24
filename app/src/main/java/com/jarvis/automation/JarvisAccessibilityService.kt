package com.jarvis.automation

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Context
import android.graphics.Path
import android.media.AudioManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.speech.tts.TextToSpeech
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import io.ktor.http.HttpStatusCode
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.application.ApplicationCall
import io.ktor.server.application.call
import io.ktor.server.application.install
import io.ktor.server.engine.ApplicationEngine
import io.ktor.server.engine.embeddedServer
import io.ktor.server.netty.Netty
import io.ktor.server.plugins.contentnegotiation.ContentNegotiation
import io.ktor.server.request.receive
import io.ktor.server.response.respond
import io.ktor.server.routing.get
import io.ktor.server.routing.post
import io.ktor.server.routing.routing
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.util.Locale
import java.util.UUID
import java.util.concurrent.CopyOnWriteArraySet
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference
import kotlin.coroutines.resume

@Serializable
data class TapRequest(
    val x: Float,
    val y: Float
)

@Serializable
data class TypeRequest(
    val text: String
)

@Serializable
data class ClickIdRequest(
    @SerialName("view_id") val viewId: String
)

@Serializable
data class SpeakRequest(
    val text: String
)

@Serializable
data class UiNodeDump(
    val id: String?,
    val text: String?,
    val clickable: Boolean
)

@Serializable
data class ActionResponse(
    val success: Boolean,
    val message: String
)

@Serializable
data class ShieldToggleRequest(
    val enabled: Boolean,
    val reason: String? = null
)

@Serializable
data class ShieldBlacklistRequest(
    val packages: List<String>,
    val mode: String = "add" // "add", "remove", "replace"
)

@Serializable
data class ShieldStatusResponse(
    val enabled: Boolean,
    val reason: String,
    val blacklist: List<String>,
    @SerialName("blocked_count") val blockedCount: Int,
    @SerialName("last_blocked_package") val lastBlockedPackage: String?,
    @SerialName("last_blocked_timestamp") val lastBlockedTimestamp: Long?
)

@Serializable
data class AnchorScheduleRequest(
    val bedtime: String = "01:30",
    val wake: String = "08:30"
)

@Serializable
data class AnchorEnforceRequest(
    val type: String, // "bedtime", "wake"
    val level: Int = 1
)

@Serializable
data class AnchorStatusResponse(
    val bedtime: String,
    val wake: String,
    @SerialName("strictness_level") val strictnessLevel: Int
)

data class BridgeStatus(
    val serviceConnected: Boolean = false,
    val serverRunning: Boolean = false,
    val ttsReady: Boolean = false,
    val error: String? = null
)

class JarvisAccessibilityService : AccessibilityService() {

    private val mainHandler = Handler(Looper.getMainLooper())
    private val serverLock = Any()
    private var serviceScope: CoroutineScope? = null

    @Volatile
    private var server: ApplicationEngine? = null

    @Volatile
    private var tts: TextToSpeech? = null

    @Volatile
    private var isTtsInitialized = false

    // Distraction Shield State
    private val distractionShieldEnabled = AtomicBoolean(false)
    private val shieldReason = AtomicReference("Scheduled deep work block")
    private val blockedCount = AtomicInteger(0)
    private val lastBlockedPackage = AtomicReference<String?>(null)
    private val lastBlockedTimestamp = AtomicLong(0L)
    private val lastBlockThrottleMs = AtomicLong(0L)

    // Default distraction packages
    private val blacklistedPackages = CopyOnWriteArraySet(
        listOf(
            "com.instagram.android",
            "com.google.android.youtube",
            "com.zhiliaoapp.musically",
            "com.twitter.android",
            "com.facebook.katana",
            "com.reddit.frontpage",
            "com.netflix.mediaclient",
            "com.snapchat.android"
        )
    )

    // Immutable whitelist: Emergency, Phone, Messaging, System UI, and Jarvis itself
    private val immutableWhitelist = setOf(
        "com.android.phone",
        "com.samsung.android.dialer",
        "com.google.android.dialer",
        "com.android.server.telecom",
        "com.android.emergency",
        "com.android.mms",
        "com.google.android.apps.messaging",
        "com.samsung.android.messaging",
        "com.jarvis.automation",
        "com.android.settings",
        "com.android.systemui"
    )

    // Circadian Anchor State
    private val bedtimeAnchor = AtomicReference("01:30")
    private val wakeAnchor = AtomicReference("08:30")
    private val circadianStrictness = AtomicInteger(1)

    override fun onServiceConnected() {
        super.onServiceConnected()
        statusFlow.update {
            it.copy(serviceConnected = true, serverRunning = false, error = null)
        }
        initTextToSpeech()
        startIpcServer()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString() ?: return
            handleWindowStateChange(pkg)
        }
    }

    private fun handleWindowStateChange(pkg: String) {
        if (!distractionShieldEnabled.get()) return
        if (immutableWhitelist.contains(pkg)) return

        if (blacklistedPackages.contains(pkg)) {
            val now = SystemClock.elapsedRealtime()
            if (now - lastBlockThrottleMs.get() > 1000L) {
                lastBlockThrottleMs.set(now)
                blockedCount.incrementAndGet()
                lastBlockedPackage.set(pkg)
                lastBlockedTimestamp.set(System.currentTimeMillis())

                // Instant hardware-level kill back to Home screen
                performGlobalAction(GLOBAL_ACTION_HOME)

                // Authoritative voice notification
                speakDirect("Access denied. $pkg restricted under active protocol. Returning to home screen.")
            }
        }
    }

    override fun onInterrupt() {
        tts?.stop()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopIpcServer()
        shutdownTextToSpeech()
        serviceScope?.cancel()
        serviceScope = null
        statusFlow.value = BridgeStatus()
    }

    private fun initTextToSpeech() {
        shutdownTextToSpeech()
        tts = TextToSpeech(this) { status ->
            val ready = status == TextToSpeech.SUCCESS
            if (ready) {
                tts?.language = Locale.getDefault()
            }
            isTtsInitialized = ready
            statusFlow.update { it.copy(ttsReady = ready) }
        }
    }

    private fun shutdownTextToSpeech() {
        isTtsInitialized = false
        tts?.stop()
        tts?.shutdown()
        tts = null
        statusFlow.update { it.copy(ttsReady = false) }
    }

    private fun speakDirect(text: String) {
        val engine = tts
        if (engine != null && isTtsInitialized) {
            val utteranceId = UUID.randomUUID().toString()
            engine.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
        }
    }

    private fun enforceCircadianBedtime(level: Int) {
        circadianStrictness.set(level)
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        if (audioManager != null) {
            val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            val targetVol = (maxVol * (level.coerceIn(1, 3) / 3.0)).toInt().coerceAtLeast(1)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVol, 0)
        }

        distractionShieldEnabled.set(true)
        shieldReason.set("Circadian Bedtime Protocol Lockout")

        val speech = when (level) {
            1 -> "Circadian anchor active. Bedtime threshold ${bedtimeAnchor.get()} reached. Conclude terminal operations."
            2 -> "Warning: Bedtime threshold exceeded. Screen lock engaging. Power down immediately."
            else -> "CRITICAL BREACH: Bedtime anchor violated. All non-essential vectors disabled. Disengage now."
        }
        speakDirect(speech)

        if (level >= 2) {
            mainHandler.postDelayed({
                performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
            }, 800L)
        }
    }

    private fun enforceCircadianWake(level: Int) {
        circadianStrictness.set(level)
        val audioManager = getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        if (audioManager != null) {
            val maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)
            val targetVol = (maxVol * (level.coerceIn(1, 3) / 3.0)).toInt().coerceAtLeast(1)
            audioManager.setStreamVolume(AudioManager.STREAM_ALARM, targetVol, 0)
        }

        distractionShieldEnabled.set(false)
        speakDirect("Wake sequence initiated. Time: ${wakeAnchor.get()}. Stand up, commence hydration, and review daily priorities.")
    }

    private fun startIpcServer() {
        stopIpcServer()
        val scope = serviceScope ?: CoroutineScope(SupervisorJob() + Dispatchers.IO).also {
            serviceScope = it
        }
        scope.launch {
            try {
                val engine = embeddedServer(Netty, port = SERVER_PORT, host = SERVER_HOST) {
                    install(ContentNegotiation) {
                        json(
                            Json {
                                ignoreUnknownKeys = true
                                encodeDefaults = true
                            }
                        )
                    }
                    routing {
                        // Gesture & Input Endpoints
                        post("/action/tap") {
                            val req = call.receiveOrBadRequest<TapRequest>() ?: return@post
                            if (!req.x.isFinite() || !req.y.isFinite() || req.x < 0f || req.y < 0f) {
                                call.respondAction(false, "Coordinates must be finite non-negative numbers")
                                return@post
                            }
                            val completed = performTap(req.x, req.y)
                            call.respondAction(
                                success = completed,
                                message = if (completed) "Tapped (${req.x}, ${req.y})" else "Tap gesture failed or cancelled",
                                failureStatus = HttpStatusCode.InternalServerError
                            )
                        }

                        post("/action/type") {
                            val req = call.receiveOrBadRequest<TypeRequest>() ?: return@post
                            val root = rootInActiveWindow
                            if (root == null) {
                                call.respondAction(false, "No active window available", HttpStatusCode.Conflict)
                                return@post
                            }
                            val target = findFocusedEditableNode(root)
                            if (target == null) {
                                call.respondAction(false, "No focused editable node found", HttpStatusCode.NotFound)
                                return@post
                            }
                            val args = Bundle().apply {
                                putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, req.text)
                            }
                            val ok = target.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
                            call.respondAction(
                                success = ok,
                                message = if (ok) "Text set on focused node" else "ACTION_SET_TEXT failed",
                                failureStatus = HttpStatusCode.InternalServerError
                            )
                        }

                        post("/action/click_id") {
                            val req = call.receiveOrBadRequest<ClickIdRequest>() ?: return@post
                            if (req.viewId.isBlank()) {
                                call.respondAction(false, "view_id must not be blank")
                                return@post
                            }
                            val root = rootInActiveWindow
                            if (root == null) {
                                call.respondAction(false, "No active window available", HttpStatusCode.Conflict)
                                return@post
                            }
                            val matches = findNodesByViewId(root, req.viewId)
                            if (matches.isEmpty()) {
                                call.respondAction(false, "No node matching view_id '${req.viewId}'", HttpStatusCode.NotFound)
                                return@post
                            }
                            val clicked = matches.any { invokeClick(it) }
                            call.respondAction(
                                success = clicked,
                                message = if (clicked) "Clicked '${req.viewId}'" else "ACTION_CLICK failed for '${req.viewId}'",
                                failureStatus = HttpStatusCode.InternalServerError
                            )
                        }

                        // Speech Endpoint
                        post("/voice/speak") {
                            val req = call.receiveOrBadRequest<SpeakRequest>() ?: return@post
                            val engineInstance = tts
                            if (engineInstance == null || !isTtsInitialized) {
                                call.respondAction(false, "TextToSpeech engine is not ready", HttpStatusCode.ServiceUnavailable)
                                return@post
                            }
                            val utteranceId = UUID.randomUUID().toString()
                            val queued = engineInstance.speak(req.text, TextToSpeech.QUEUE_ADD, null, utteranceId) == TextToSpeech.SUCCESS
                            call.respondAction(
                                success = queued,
                                message = if (queued) "Speech queued" else "Failed to queue speech",
                                failureStatus = HttpStatusCode.InternalServerError
                            )
                        }

                        // Distraction Shield Endpoints
                        post("/shield/toggle") {
                            val req = call.receiveOrBadRequest<ShieldToggleRequest>() ?: return@post
                            distractionShieldEnabled.set(req.enabled)
                            if (!req.reason.isNullOrBlank()) {
                                shieldReason.set(req.reason)
                            }
                            val stateDesc = if (req.enabled) "ACTIVE (${shieldReason.get()})" else "STANDBY"
                            call.respond(HttpStatusCode.OK, ActionResponse(true, "Distraction Shield is now $stateDesc"))
                        }

                        post("/shield/blacklist") {
                            val req = call.receiveOrBadRequest<ShieldBlacklistRequest>() ?: return@post
                            when (req.mode.lowercase()) {
                                "replace" -> {
                                    blacklistedPackages.clear()
                                    blacklistedPackages.addAll(req.packages)
                                }
                                "remove" -> blacklistedPackages.removeAll(req.packages.toSet())
                                else -> blacklistedPackages.addAll(req.packages)
                            }
                            call.respond(
                                HttpStatusCode.OK,
                                ActionResponse(true, "Blacklist updated. Active vector count: ${blacklistedPackages.size}")
                            )
                        }

                        get("/shield/status") {
                            call.respond(
                                HttpStatusCode.OK,
                                ShieldStatusResponse(
                                    enabled = distractionShieldEnabled.get(),
                                    reason = shieldReason.get(),
                                    blacklist = blacklistedPackages.toList(),
                                    blockedCount = blockedCount.get(),
                                    lastBlockedPackage = lastBlockedPackage.get(),
                                    lastBlockedTimestamp = lastBlockedTimestamp.get().takeIf { it > 0 }
                                )
                            )
                        }

                        // Circadian Anchor Endpoints
                        post("/anchor/schedule") {
                            val req = call.receiveOrBadRequest<AnchorScheduleRequest>() ?: return@post
                            bedtimeAnchor.set(req.bedtime)
                            wakeAnchor.set(req.wake)
                            call.respond(
                                HttpStatusCode.OK,
                                ActionResponse(true, "Circadian Anchors configured: Bedtime ${req.bedtime}, Wake ${req.wake}")
                            )
                        }

                        post("/anchor/enforce") {
                            val req = call.receiveOrBadRequest<AnchorEnforceRequest>() ?: return@post
                            if (req.type.equals("bedtime", ignoreCase = true)) {
                                enforceCircadianBedtime(req.level)
                            } else {
                                enforceCircadianWake(req.level)
                            }
                            call.respond(
                                HttpStatusCode.OK,
                                ActionResponse(true, "Circadian anchor enforcement executed: ${req.type} (Level ${req.level})")
                            )
                        }

                        get("/anchor/status") {
                            call.respond(
                                HttpStatusCode.OK,
                                AnchorStatusResponse(
                                    bedtime = bedtimeAnchor.get(),
                                    wake = wakeAnchor.get(),
                                    strictnessLevel = circadianStrictness.get()
                                )
                            )
                        }

                        // UI Tree Dump Endpoint
                        get("/ui/dump") {
                            val nodes = mutableListOf<UiNodeDump>()
                            traverseTree(rootInActiveWindow, nodes)
                            call.respond(HttpStatusCode.OK, nodes)
                        }
                    }
                }
                synchronized(serverLock) {
                    if (!isActive) return@launch
                    server = engine
                }
                engine.start(wait = false)
                if (!isActive) {
                    stopIpcServer()
                    return@launch
                }
                statusFlow.update { it.copy(serverRunning = true, error = null) }
            } catch (t: Throwable) {
                stopIpcServer()
                statusFlow.update {
                    it.copy(serverRunning = false, error = t.message ?: t::class.java.simpleName)
                }
            }
        }
    }

    private fun stopIpcServer() {
        val current = synchronized(serverLock) {
            server.also { server = null }
        }
        runCatching { current?.stop(200, 500) }
        statusFlow.update { it.copy(serverRunning = false) }
    }

    private suspend fun performTap(x: Float, y: Float): Boolean {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0L, TAP_DURATION_MS)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()

        return withTimeoutOrNull(GESTURE_TIMEOUT_MS) {
            suspendCancellableCoroutine { cont ->
                val dispatched = dispatchGesture(
                    gesture,
                    object : GestureResultCallback() {
                        override fun onCompleted(gestureDescription: GestureDescription?) {
                            if (cont.isActive) cont.resume(true)
                        }

                        override fun onCancelled(gestureDescription: GestureDescription?) {
                            if (cont.isActive) cont.resume(false)
                        }
                    },
                    mainHandler
                )
                if (!dispatched && cont.isActive) {
                    cont.resume(false)
                }
            }
        } ?: false
    }

    private fun findFocusedEditableNode(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val inputFocused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        if (inputFocused != null && inputFocused.isEditable) {
            return inputFocused
        }
        return findFirstNode(root) { it.isEditable && it.isFocused }
    }

    private fun findNodesByViewId(root: AccessibilityNodeInfo, viewId: String): List<AccessibilityNodeInfo> {
        val direct = root.findAccessibilityNodeInfosByViewId(viewId)
        if (!direct.isNullOrEmpty()) {
            return direct
        }
        val matches = mutableListOf<AccessibilityNodeInfo>()
        collectNodes(root, matches) { node ->
            val resourceName = node.viewIdResourceName ?: return@collectNodes false
            resourceName == viewId || (!viewId.contains(":") && resourceName.endsWith(":id/$viewId"))
        }
        return matches
    }

    private fun invokeClick(node: AccessibilityNodeInfo): Boolean {
        if (node.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
            return true
        }
        var parent = node.parent
        var depth = 0
        while (parent != null && depth < MAX_PARENT_WALK) {
            if (parent.isClickable && parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)) {
                return true
            }
            parent = parent.parent
            depth++
        }
        return false
    }

    private fun findFirstNode(
        node: AccessibilityNodeInfo?,
        depth: Int = 0,
        predicate: (AccessibilityNodeInfo) -> Boolean
    ): AccessibilityNodeInfo? {
        if (node == null || depth > MAX_TREE_DEPTH) return null
        if (predicate(node)) return node
        for (i in 0 until node.childCount) {
            val found = findFirstNode(node.getChild(i), depth + 1, predicate)
            if (found != null) return found
        }
        return null
    }

    private fun collectNodes(
        node: AccessibilityNodeInfo?,
        out: MutableList<AccessibilityNodeInfo>,
        depth: Int = 0,
        predicate: (AccessibilityNodeInfo) -> Boolean
    ) {
        if (node == null || depth > MAX_TREE_DEPTH) return
        if (predicate(node)) {
            out.add(node)
        }
        for (i in 0 until node.childCount) {
            collectNodes(node.getChild(i), out, depth + 1, predicate)
        }
    }

    private fun traverseTree(
        node: AccessibilityNodeInfo?,
        out: MutableList<UiNodeDump>,
        depth: Int = 0
    ) {
        if (node == null || depth > MAX_TREE_DEPTH) return
        out.add(
            UiNodeDump(
                id = node.viewIdResourceName,
                text = node.text?.toString(),
                clickable = node.isClickable
            )
        )
        for (i in 0 until node.childCount) {
            traverseTree(node.getChild(i), out, depth + 1)
        }
    }

    private suspend inline fun <reified T : Any> ApplicationCall.receiveOrBadRequest(): T? {
        return try {
            receive<T>()
        } catch (t: Throwable) {
            respondAction(false, "Invalid request payload: ${t.message ?: "malformed JSON"}")
            null
        }
    }

    private suspend fun ApplicationCall.respondAction(
        success: Boolean,
        message: String,
        failureStatus: HttpStatusCode = HttpStatusCode.BadRequest
    ) {
        respond(if (success) HttpStatusCode.OK else failureStatus, ActionResponse(success, message))
    }

    companion object {
        const val SERVER_HOST = "127.0.0.1"
        const val SERVER_PORT = 8765
        private const val TAP_DURATION_MS = 50L
        private const val GESTURE_TIMEOUT_MS = 2000L
        private const val MAX_TREE_DEPTH = 100
        private const val MAX_PARENT_WALK = 5

        private val statusFlow = MutableStateFlow(BridgeStatus())
        val status: StateFlow<BridgeStatus> = statusFlow.asStateFlow()
    }
}
