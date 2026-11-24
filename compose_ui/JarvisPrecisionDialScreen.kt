package com.jarvis.app.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jarvis.app.ui.components.JarvisDynamicIsland
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Multi-Axis Precision Chronometer Dial Screen for JARVIS.
 * Implements GPU-cached 120-tick procedural radial geometry, counter-rotating rings,
 * breathing focus pulse, and ambient atmospheric radial illumination.
 */
@Composable
fun JarvisPrecisionDialScreen(
    bedtimeTarget: String = "01:30",
    bedtimeCountdown: String = "02:22:15",
    isShieldActive: Boolean = false,
    onToggleShield: () -> Unit = {},
    onNavigateDashboard: () -> Unit = {},
    onTriggerVoice: () -> Unit = {}
) {
    val infiniteTransition = rememberInfiniteTransition(label = "JarvisPrecisionDial")

    // Main 12-second clockwise rotation (1x)
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(12000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "MainRotation"
    )

    // Breathing Focus Pulse: 6-second cycle FastOutSlowInEasing harmonic oscillator
    val focusProgress by infiniteTransition.animateFloat(
        initialValue = 0.82f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(6000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "BreathingPulse"
    )

    // Inner Counter-Rotating Ring: -360 degrees over 20 seconds
    val innerRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = -360f,
        animationSpec = infiniteRepeatable(
            animation = tween(20000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "InnerCounterRotation"
    )

    val backgroundBase = MaterialTheme.colorScheme.background
    val primaryColor = MaterialTheme.colorScheme.primary
    val secondaryColor = MaterialTheme.colorScheme.secondary
    val tertiaryColor = MaterialTheme.colorScheme.tertiary
    val onBackgroundColor = MaterialTheme.colorScheme.onBackground

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundBase),
        contentAlignment = Alignment.Center
    ) {
        val screenWidth = maxWidth
        val screenHeight = maxHeight
        val minDimValue = if (screenWidth < screenHeight) screenWidth.value else screenHeight.value

        val dialSize = (minDimValue * 0.85f).dp
        val textSize = (minDimValue * 0.08f).sp
        val subTextSizeValue = minDimValue * 0.035f

        // 1. Atmospheric Ambient Radial Glow (Tertiary Accent @ 0.12 alpha)
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2f, size.height / 2f)
            val radius = size.minDimension * 0.50f
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        tertiaryColor.copy(alpha = 0.12f),
                        secondaryColor.copy(alpha = 0.04f),
                        Color.Transparent
                    ),
                    center = center,
                    radius = radius * 2f
                ),
                center = center,
                radius = radius * 2f
            )
        }

        // 2. Persistent Dynamic Island Insignia at the Top
        JarvisDynamicIsland(
            isShieldActive = isShieldActive,
            onToggleShield = onToggleShield,
            modifier = Modifier
                .windowInsetsPadding(WindowInsets.statusBars)
                .align(Alignment.TopCenter)
        )

        // 3. Multi-Axis Chronometer Dial with Breathing Focus Pulse
        Box(
            modifier = Modifier
                .size(dialSize)
                .scale(0.85f + (focusProgress * 0.15f))
                .alpha(focusProgress)
                .clickable { onNavigateDashboard() },
            contentAlignment = Alignment.Center
        ) {
            // Background Static Base Plate
            Canvas(modifier = Modifier.fillMaxSize()) {
                val center = Offset(size.width / 2f, size.height / 2f)
                val baseRadius = size.minDimension / 2f
                drawCircle(
                    color = secondaryColor.copy(alpha = 0.08f),
                    radius = baseRadius * 0.95f,
                    center = center
                )
            }

            // Outer Ring Layer (20% Speed Clockwise: rotation * 0.2f)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationZ = rotation * 0.2f }
                    .drawWithCache {
                        onDrawBehind {
                            val center = Offset(size.width / 2f, size.height / 2f)
                            val baseRadius = size.minDimension / 2f
                            drawCircle(
                                color = onBackgroundColor.copy(alpha = 0.04f),
                                radius = baseRadius,
                                style = Stroke(width = 1.dp.toPx())
                            )
                            drawArc(
                                color = secondaryColor.copy(alpha = 0.35f),
                                startAngle = 0f,
                                sweepAngle = 100f,
                                useCenter = false,
                                style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }
                    }
            )

            // Main Dial Ticks Layer (120 Procedural Radial Ticks Cached on GPU)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationZ = rotation }
                    .drawWithCache {
                        onDrawBehind {
                            val center = Offset(size.width / 2f, size.height / 2f)
                            val baseRadius = size.minDimension / 2f
                            val tickColorMajor = onBackgroundColor.copy(alpha = 0.65f)
                            val tickColorMinor = onBackgroundColor.copy(alpha = 0.18f)
                            val majorStroke = 1.5f.dp.toPx()
                            val minorStroke = 0.75f.dp.toPx()

                            for (i in 0 until 120) {
                                val angle = (i * 3f) * (PI.toFloat() / 180f)
                                val isQuarter = (i % 30 == 0)
                                val isMajor = (i % 10 == 0)

                                val radiusFactor = baseRadius * 0.90f
                                val tickLength = when {
                                    isQuarter -> radiusFactor * 0.12f
                                    isMajor -> radiusFactor * 0.08f
                                    else -> radiusFactor * 0.03f
                                }

                                val start = Offset(
                                    center.x + radiusFactor * cos(angle.toDouble()).toFloat(),
                                    center.y + radiusFactor * sin(angle.toDouble()).toFloat()
                                )
                                val end = Offset(
                                    center.x + (radiusFactor - tickLength) * cos(angle.toDouble()).toFloat(),
                                    center.y + (radiusFactor - tickLength) * sin(angle.toDouble()).toFloat()
                                )

                                drawLine(
                                    color = if (isMajor) tickColorMajor else tickColorMinor,
                                    start = start,
                                    end = end,
                                    strokeWidth = if (isMajor) majorStroke else minorStroke,
                                    cap = StrokeCap.Round
                                )
                            }
                        }
                    }
            )

            // Inner Ring Layer (Counter-Rotating -360 degrees over 20s with 8 Orbital Pips)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationZ = innerRotation }
                    .drawWithCache {
                        onDrawBehind {
                            val center = Offset(size.width / 2f, size.height / 2f)
                            val baseRadius = size.minDimension / 2f
                            val innerRadius = baseRadius * 0.60f
                            drawCircle(
                                color = onBackgroundColor.copy(alpha = 0.08f),
                                radius = innerRadius,
                                style = Stroke(width = 0.75f.dp.toPx())
                            )
                            for (i in 0 until 8) {
                                val angle = (i * 45f) * (PI.toFloat() / 180f)
                                drawCircle(
                                    color = secondaryColor.copy(alpha = 0.6f),
                                    radius = 3.5f.dp.toPx(),
                                    center = Offset(
                                        center.x + innerRadius * cos(angle.toDouble()).toFloat(),
                                        center.y + innerRadius * sin(angle.toDouble()).toFloat()
                                    )
                                )
                            }
                        }
                    }
            )

            // Center Reticle Layer (Independent 50% Speed Rotation: rotation * 0.5f)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer { rotationZ = rotation * 0.5f }
                    .drawWithCache {
                        onDrawBehind {
                            val center = Offset(size.width / 2f, size.height / 2f)
                            val baseRadius = size.minDimension / 2f
                            val crossRadius = baseRadius * 0.28f
                            drawLine(
                                color = secondaryColor.copy(alpha = 0.35f),
                                start = Offset(center.x - crossRadius, center.y),
                                end = Offset(center.x + crossRadius, center.y),
                                strokeWidth = 1f.dp.toPx()
                            )
                            drawLine(
                                color = secondaryColor.copy(alpha = 0.35f),
                                start = Offset(center.x, center.y - crossRadius),
                                end = Offset(center.x, center.y + crossRadius),
                                strokeWidth = 1f.dp.toPx()
                            )
                        }
                    }
            )

            // Center HUD Core Text
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
                modifier = Modifier
                    .clickable { onTriggerVoice() }
                    .padding(16.dp)
            ) {
                Text(
                    text = "JARVIS",
                    fontSize = textSize,
                    fontWeight = FontWeight.ExtraLight,
                    color = onBackgroundColor,
                    letterSpacing = (minDimValue * 0.05f).sp
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "BEDTIME $bedtimeTarget ($bedtimeCountdown)",
                    fontSize = (subTextSizeValue * 0.75f).sp,
                    fontWeight = FontWeight.Bold,
                    color = secondaryColor.copy(alpha = 0.75f),
                    letterSpacing = 2.sp
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = if (isShieldActive) "SHIELD: ARMED" else "STANDBY NOMINAL",
                    fontSize = (subTextSizeValue * 0.60f).sp,
                    fontWeight = FontWeight.Medium,
                    color = primaryColor.copy(alpha = 0.5f),
                    letterSpacing = 1.sp
                )
            }
        }
    }
}
