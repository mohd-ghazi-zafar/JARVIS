package com.jarvis.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Sophisticated Warm Luxury Palette
val JarvisDarkCharcoal = Color(0xFF121212)
val JarvisSurfaceCharcoal = Color(0xFF1A1A1A)
val JarvisCream = Color(0xFFF5F5DC)        // Primary Cream / Beige
val JarvisTan = Color(0xFFD2B48C)          // Secondary Tan Accent
val JarvisSaddleBrown = Color(0xFF8B4513)  // Tertiary Saddle Brown
val JarvisUmber = Color(0xFF5D4037)        // Dark Accent
val JarvisGold = Color(0xFFE6BE8A)         // Insignia Gold

private val DarkColorScheme = darkColorScheme(
    primary = JarvisCream,
    secondary = JarvisTan,
    tertiary = JarvisSaddleBrown,
    background = JarvisDarkCharcoal,
    surface = JarvisSurfaceCharcoal,
    onBackground = JarvisCream,
    onSurface = JarvisCream
)

private val LightColorScheme = lightColorScheme(
    primary = JarvisUmber,
    secondary = JarvisSaddleBrown,
    tertiary = JarvisTan,
    background = JarvisCream,
    surface = JarvisCream,
    onBackground = Color(0xFF212121),
    onSurface = Color(0xFF212121)
)

@Composable
fun JarvisTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
