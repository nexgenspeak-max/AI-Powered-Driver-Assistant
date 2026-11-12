package com.chinhtruongba.driverapp.feature.voice.ui

import android.Manifest
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.res.stringResource
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.app.LocalPermissions
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme

/** Dialog + permission plumbing shared by the orb and the composer voice button. */
class VoiceActionHandler internal constructor(
    private val vm: AssistantViewModel,
    private val requestMic: (onDone: () -> Unit) -> Unit,
    private val showCancelCall: () -> Unit,
    private val showMissingPhone: () -> Unit,
) {
    fun perform(action: OrbAction) {
        when (action) {
            OrbAction.Ignore -> Unit
            OrbAction.OpenPanel -> vm.openPanel()
            OrbAction.ConfirmCancelCall -> showCancelCall()
            OrbAction.Disconnect -> vm.disconnect()
            OrbAction.MissingPhone -> showMissingPhone()
            is OrbAction.Connect -> {
                vm.openPanel()
                // The mic is requested on each connect; LiveKit simply publishes nothing if denied.
                requestMic { vm.connect(action.phone) }
            }
        }
    }

    fun onOrbTap() = perform(vm.orbAction())
}

@Composable
fun rememberVoiceActions(vm: AssistantViewModel): VoiceActionHandler {
    val perms = LocalPermissions.current
    var cancelCall by remember { mutableStateOf(false) }
    var missingPhone by remember { mutableStateOf(false) }
    val c = CzenTheme.colors
    val bubble = stringResource(R.string.call_cancel_confirm)

    if (cancelCall) {
        AlertDialog(
            onDismissRequest = { cancelCall = false },
            containerColor = c.surfaceElevated,
            title = { Text(stringResource(R.string.call_cancel_title), style = CzenTheme.type.h2, color = c.textPrimary) },
            text = { Text(stringResource(R.string.call_cancel_body), style = CzenTheme.type.body, color = c.textSecondary) },
            dismissButton = {
                TextButton(onClick = { cancelCall = false }) { Text(stringResource(R.string.call_cancel_keep), color = c.textPrimary) }
            },
            confirmButton = {
                TextButton(onClick = {
                    cancelCall = false
                    vm.confirmCancelCall(bubble)
                }) { Text(stringResource(R.string.call_cancel_confirm), color = c.danger) }
            },
        )
    }
    if (missingPhone) {
        AlertDialog(
            onDismissRequest = { missingPhone = false },
            containerColor = c.surfaceElevated,
            title = { Text(stringResource(R.string.common_error), style = CzenTheme.type.h2, color = c.textPrimary) },
            text = { Text(stringResource(R.string.orb_missing_phone), style = CzenTheme.type.body, color = c.textSecondary) },
            confirmButton = { TextButton(onClick = { missingPhone = false }) { Text(stringResource(R.string.common_ok), color = c.primary) } },
        )
    }
    return remember(vm, perms) {
        VoiceActionHandler(
            vm = vm,
            requestMic = { done ->
                if (perms == null) done() else perms.request(arrayOf(Manifest.permission.RECORD_AUDIO)) { done() }
            },
            showCancelCall = { cancelCall = true },
            showMissingPhone = { missingPhone = true },
        )
    }
}
