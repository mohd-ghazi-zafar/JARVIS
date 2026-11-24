package com.jarvis.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import com.jarvis.app.ui.components.JarvisDynamicIsland
import com.jarvis.app.ui.components.JarvisWellbeingCard

/**
 * Jarvis Executive Dashboard Screen.
 * Presents all 3 Blueprint modules with luxury glassmorphic cards and dynamic island header.
 */
@Composable
fun JarvisDashboardScreen(
    isShieldActive: Boolean = false,
    bedtimeCountdown: String = "02:22:15",
    escalationLevel: Int = 1,
    shieldBreaches: Int = 0,
    taskCompletionRate: Int = 85,
    pendingTasksCount: Int = 3,
    topTaskTitle: String = "Deploy Edge Security Architecture",
    adherenceScore: Double = 86.0,
    strictnessLevel: Int = 1,
    cpuUsage: Double = 32.5,
    ramUsage: Double = 58.2,
    onToggleShield: () -> Unit = {},
    onTriggerSummary: () -> Unit = {},
    onNavigateDial: () -> Unit = {}
) {
    Box(
        modifier = Modifier.fillMaxSize()
    ) {
        // Persistent Top Dynamic Island
        JarvisDynamicIsland(
            isShieldActive = isShieldActive,
            onToggleShield = onToggleShield,
            modifier = Modifier
                .windowInsetsPadding(WindowInsets.statusBars)
                .align(Alignment.TopCenter)
                .zIndex(10f)
        )

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
            contentPadding = PaddingValues(top = 90.dp, bottom = 48.dp)
        ) {
            // Header Greeting
            item {
                Column {
                    Text(
                        text = "Operational Protocol",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraLight,
                        color = MaterialTheme.colorScheme.onBackground
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "All subsystems operating within deterministic parameters, Boss.",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Normal,
                        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.5f),
                        letterSpacing = 0.5.sp
                    )
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // 1. Circadian Anchor Module Card
            item {
                JarvisWellbeingCard(
                    title = "Circadian Anchor Engine",
                    value = bedtimeCountdown,
                    label = "01:30 AM Bedtime Window | 08:30 AM Wake Anchor",
                    badgeText = "LEVEL $escalationLevel",
                    gradientColors = listOf(
                        Color(0xFF8B4513).copy(alpha = 0.35f),
                        Color.Transparent
                    ),
                    onClick = onNavigateDial
                )
            }

            // 2. Distraction Shield Module Card
            item {
                JarvisWellbeingCard(
                    title = "Distraction Shield",
                    value = if (isShieldActive) "ACTIVE" else "DISENGAGED",
                    label = "$shieldBreaches breaches restricted | 7 entertainment vectors monitored",
                    badgeText = if (isShieldActive) "LOCKED" else "STANDBY",
                    gradientColors = listOf(
                        Color(0xFFD2B48C).copy(alpha = 0.30f),
                        Color.Transparent
                    ),
                    onClick = onToggleShield
                )
            }

            // 3. Dynamic Task Prioritizer Card
            item {
                JarvisWellbeingCard(
                    title = "Task Ledger",
                    value = "$taskCompletionRate%",
                    label = "$pendingTasksCount pending | Top: '$topTaskTitle'",
                    badgeText = "PRIORITY P4",
                    gradientColors = listOf(
                        Color(0xFF5D4037).copy(alpha = 0.35f),
                        Color.Transparent
                    )
                )
            }

            // 4. Daily Analytics & Strictness Card
            item {
                JarvisWellbeingCard(
                    title = "Analytics & Habit Loop",
                    value = "${adherenceScore.toInt()}%",
                    label = "Strictness Level $strictnessLevel | Tap for Evening Summary Brief",
                    badgeText = "ADHERENCE",
                    gradientColors = listOf(
                        Color(0xFFE6BE8A).copy(alpha = 0.30f),
                        Color.Transparent
                    ),
                    onClick = onTriggerSummary
                )
            }

            // 5. Hardware Telemetry Card
            item {
                JarvisWellbeingCard(
                    title = "Hardware Telemetry",
                    value = "${cpuUsage.toInt()}% CPU",
                    label = "RAM: ${ramUsage.toInt()}% | Zero-LLM sub-millisecond execution",
                    badgeText = "HARDWARE",
                    gradientColors = listOf(
                        Color(0xFF8B4513).copy(alpha = 0.25f),
                        Color.Transparent
                    )
                )
            }
        }
    }
}
