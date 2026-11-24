package com.jarvis.app.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathOperation
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.jarvis.app.ui.theme.JarvisGold
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Spring-Physics Dynamic Island Insignia for Jarvis.
 * Features bouncy spring expansion, mathematical boolean crescent moon and 8-ray sun morphing.
 */
@Composable
fun JarvisDynamicIsland(
    isShieldActive: Boolean,
    onToggleShield: () -> Unit,
    modifier: Modifier = Modifier
) {
    var expanded by remember { mutableStateOf(false) }

    // Spring-physics bouncy expansion
    val width by animateDpAsState(
        targetValue = if (expanded) 220.dp else 44.dp,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioLowBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "IslandWidth"
    )

    val iconColor by animateColorAsState(
        targetValue = if (isShieldActive) JarvisGold else MaterialTheme.colorScheme.secondary,
        animationSpec = tween(500),
        label = "IconColor"
    )

    Surface(
        modifier = modifier
            .padding(vertical = 18.dp)
            .width(width)
            .height(34.dp)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) {
                expanded = !expanded
                onToggleShield()
            },
        color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.92f),
        shape = RoundedCornerShape(percent = 50),
        shadowElevation = 8.dp
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Mode Indicator: Boolean Difference Moon vs. Trigonometric 8-Ray Sun
                AnimatedContent(
                    targetState = isShieldActive,
                    transitionSpec = {
                        (fadeIn(tween(400)) + scaleIn(tween(400), initialScale = 0.5f)) togetherWith
                        (fadeOut(tween(400)) + scaleOut(tween(400), targetScale = 0.5f))
                    },
                    label = "InsigniaSwap"
                ) { shieldActive ->
                    val iconSize = 22.dp
                    Canvas(
                        modifier = Modifier
                            .size(iconSize)
                            .drawWithCache {
                                val sizePx = size.minDimension
                                val center = Offset(size.width / 2f, size.height / 2f)

                                if (!shieldActive) {
                                    // Pointy Crescent Moon via Boolean Difference (PathOperation.Difference)
                                    val mainRadius = sizePx * 0.45f
                                    val offset = mainRadius * 0.45f
                                    val shiftX = offset * 0.5f

                                    val moonPath = Path().apply {
                                        addOval(
                                            Rect(
                                                left = center.x - mainRadius + shiftX,
                                                top = center.y - mainRadius,
                                                right = center.x + mainRadius + shiftX,
                                                bottom = center.y + mainRadius
                                            )
                                        )
                                    }
                                    val cutPath = Path().apply {
                                        addOval(
                                            Rect(
                                                left = center.x - mainRadius + offset + shiftX,
                                                top = center.y - mainRadius,
                                                right = center.x + mainRadius + offset + shiftX,
                                                bottom = center.y + mainRadius
                                            )
                                        )
                                    }

                                    val finalCrescent = Path.combine(
                                        PathOperation.Difference,
                                        moonPath,
                                        cutPath
                                    )
                                    onDrawBehind {
                                        drawPath(finalCrescent, color = iconColor)
                                    }
                                } else {
                                    // 8-Ray Sun via Trigonometric Ray Projection (45-degree intervals)
                                    val sunRadius = sizePx * 0.26f
                                    val rayStart = sunRadius * 1.3f
                                    val rayEnd = sizePx * 0.52f
                                    val rayWidth = 2.dp.toPx()

                                    onDrawBehind {
                                        drawCircle(color = iconColor, radius = sunRadius, center = center)
                                        for (i in 0 until 8) {
                                            val angle = (i * 45f) * (PI.toFloat() / 180f)
                                            drawLine(
                                                color = iconColor,
                                                start = Offset(
                                                    center.x + rayStart * cos(angle.toDouble()).toFloat(),
                                                    center.y + rayStart * sin(angle.toDouble()).toFloat()
                                                ),
                                                end = Offset(
                                                    center.x + rayEnd * cos(angle.toDouble()).toFloat(),
                                                    center.y + rayEnd * sin(angle.toDouble()).toFloat()
                                                ),
                                                strokeWidth = rayWidth,
                                                cap = StrokeCap.Round
                                            )
                                        }
                                    }
                                }
                            }
                    ) {}
                }

                // Expandable Pill Label with Auto-Collapse
                AnimatedVisibility(
                    visible = expanded,
                    enter = fadeIn(tween(400)) + expandHorizontally(),
                    exit = fadeOut(tween(400)) + shrinkHorizontally()
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        LaunchedEffect(Unit) {
                            delay(3000)
                            expanded = false
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = if (isShieldActive) "SHIELD ACTIVE" else "CIRCADIAN ANCHOR",
                            color = MaterialTheme.colorScheme.background,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 2.sp,
                            maxLines = 1
                        )
                    }
                }
            }
        }
    }
}
