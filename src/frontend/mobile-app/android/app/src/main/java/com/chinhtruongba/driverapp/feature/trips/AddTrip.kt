package com.chinhtruongba.driverapp.feature.trips

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.lifecycle.viewmodel.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.model.ApiException
import com.chinhtruongba.driverapp.core.model.CreateTripRequest
import com.chinhtruongba.driverapp.designsystem.components.CzenAlert
import com.chinhtruongba.driverapp.designsystem.components.CzenButton
import com.chinhtruongba.driverapp.designsystem.components.CzenTextField
import com.chinhtruongba.driverapp.designsystem.components.CzenToggle
import com.chinhtruongba.driverapp.designsystem.components.Screen
import com.chinhtruongba.driverapp.designsystem.components.SectionTitle
import com.chinhtruongba.driverapp.designsystem.components.SurfaceCard
import com.chinhtruongba.driverapp.designsystem.theme.CzenTheme
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AddTripUiState(
    val phone: String = "",
    val name: String = "",
    val pickup: String = "",
    val dropoff: String = "",
    val note: String = "",
    val bulky: Boolean = false,
    val children: Boolean = false,
    val errors: Map<String, Int> = emptyMap(),
    val submitting: Boolean = false,
    val done: Boolean = false,
    /** Non-null shows "Không tạo được chuyến"; empty string = generic body. */
    val failure: String? = null,
)

@HiltViewModel
class AddTripViewModel @Inject constructor(private val drivers: DriverRepository) : ViewModel() {
    private val _ui = MutableStateFlow(AddTripUiState())
    val ui: StateFlow<AddTripUiState> = _ui.asStateFlow()

    fun set(field: String, v: String) = _ui.update {
        val e = it.errors - field
        when (field) {
            "phone" -> it.copy(phone = v, errors = e)
            "name" -> it.copy(name = v)
            "pickup" -> it.copy(pickup = v, errors = e)
            "dropoff" -> it.copy(dropoff = v, errors = e)
            "note" -> it.copy(note = v)
            else -> it
        }
    }

    fun setBulky(b: Boolean) = _ui.update { it.copy(bulky = b) }
    fun setChildren(b: Boolean) = _ui.update { it.copy(children = b) }
    fun dismissFailure() = _ui.update { it.copy(failure = null) }

    fun submit() {
        val s = _ui.value
        if (s.submitting) return
        val errors = buildMap {
            if (s.phone.isBlank()) put("phone", R.string.add_trip_phone_error)
            if (s.pickup.isBlank()) put("pickup", R.string.add_trip_pickup_error)
            if (s.dropoff.isBlank()) put("dropoff", R.string.add_trip_dropoff_error)
        }
        if (errors.isNotEmpty()) {
            _ui.update { it.copy(errors = errors) }
            return
        }
        _ui.update { it.copy(submitting = true) }
        viewModelScope.launch {
            try {
                drivers.createTrip(
                    CreateTripRequest(
                        customerPhone = s.phone.trim(),
                        pickupAddress = s.pickup.trim(),
                        dropoffAddress = s.dropoff.trim(),
                        customerName = s.name.trim().ifBlank { null },
                        note = s.note.trim().ifBlank { null },
                        hasBulkyGoods = s.bulky,
                        withChildren = s.children,
                    ),
                )
                _ui.update { it.copy(submitting = false, done = true) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _ui.update { it.copy(submitting = false, failure = (e as? ApiException)?.detail.orEmpty()) }
            }
        }
    }
}

/** "Thêm chuyến (tự tạo)" — posts `booked_via: driver`, returns to Chuyến. */
@Composable
fun AddTripScreen(onDone: () -> Unit, vm: AddTripViewModel = hiltViewModel()) {
    val s by vm.ui.collectAsStateWithLifecycle()
    val c = CzenTheme.colors
    LaunchedEffect(s.done) { if (s.done) onDone() }
    fun err(k: String) = s.errors[k]
    Screen(stringResource(R.string.add_trip_title), onBack = onDone) {
        Text(stringResource(R.string.add_trip_intro), style = CzenTheme.type.body, color = c.textSecondary)
        SectionTitle(stringResource(R.string.add_trip_section_customer))
        SurfaceCard(flat = true) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                CzenTextField(
                    s.phone, { vm.set("phone", it) }, stringResource(R.string.add_trip_phone),
                    placeholder = stringResource(R.string.add_trip_phone_placeholder),
                    error = err("phone")?.let { stringResource(it) }, keyboardType = KeyboardType.Phone,
                )
                CzenTextField(
                    s.name, { vm.set("name", it) }, stringResource(R.string.add_trip_name),
                    placeholder = stringResource(R.string.add_trip_name_placeholder), capitalization = KeyboardCapitalization.Words,
                )
            }
        }
        SectionTitle(stringResource(R.string.add_trip_section_route))
        SurfaceCard(flat = true) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                CzenTextField(
                    s.pickup, { vm.set("pickup", it) }, stringResource(R.string.add_trip_pickup),
                    placeholder = stringResource(R.string.add_trip_address_placeholder), error = err("pickup")?.let { stringResource(it) },
                    capitalization = KeyboardCapitalization.Sentences,
                )
                CzenTextField(
                    s.dropoff, { vm.set("dropoff", it) }, stringResource(R.string.add_trip_dropoff),
                    placeholder = stringResource(R.string.add_trip_address_placeholder), error = err("dropoff")?.let { stringResource(it) },
                    capitalization = KeyboardCapitalization.Sentences,
                )
                CzenTextField(
                    s.note, { vm.set("note", it) }, stringResource(R.string.add_trip_note),
                    singleLine = false, imeAction = ImeAction.Default, capitalization = KeyboardCapitalization.Sentences,
                )
            }
        }
        SectionTitle(stringResource(R.string.add_trip_section_special))
        SurfaceCard(flat = true) {
            Column(Modifier.padding(horizontal = 16.dp, vertical = 6.dp)) {
                ToggleRow(stringResource(R.string.add_trip_bulky), s.bulky, vm::setBulky)
                ToggleRow(stringResource(R.string.add_trip_children), s.children, vm::setChildren)
            }
        }
        CzenButton(stringResource(R.string.add_trip_submit), vm::submit, Modifier.fillMaxWidth(), loading = s.submitting)
    }
    s.failure?.let { detail ->
        CzenAlert(
            stringResource(R.string.add_trip_failed),
            detail.ifBlank { stringResource(R.string.add_trip_failed_body) },
            confirmLabel = stringResource(R.string.common_ok),
            onConfirm = vm::dismissFailure,
            onDismiss = vm::dismissFailure,
        )
    }
}

@Composable
private fun ToggleRow(label: String, checked: Boolean, onChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(label, style = CzenTheme.type.body, color = CzenTheme.colors.textPrimary, modifier = Modifier.weight(1f))
        CzenToggle(checked, onChange, contentDescription = label, onColor = CzenTheme.colors.primary)
    }
}
