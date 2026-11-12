package com.chinhtruongba.driverapp.designsystem.components

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme

/**
 * Native-style confirm (RN `Alert.alert` / confirmDestructive). [destructive] paints the
 * confirm label in danger. With [cancelLabel] null it is a single-button alert.
 */
@Composable
fun CzenAlert(
    title: String,
    message: String?,
    confirmLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    cancelLabel: String? = null,
    destructive: Boolean = false,
) {
    val c = CzenTheme.colors
    AlertDialog(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(28.dp),
        containerColor = c.surfaceElevated,
        title = { Text(title, style = CzenTheme.type.h2, color = c.textPrimary) },
        text = message?.let { { Text(it, style = CzenTheme.type.body, color = c.textSecondary) } },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    confirmLabel,
                    style = CzenTheme.type.bodyStrong.copy(fontWeight = FontWeight.SemiBold),
                    color = if (destructive) c.danger else c.primary,
                )
            }
        },
        dismissButton = cancelLabel?.let {
            {
                TextButton(onClick = onDismiss) { Text(it, style = CzenTheme.type.bodyStrong, color = c.textSecondary) }
            }
        },
    )
}
