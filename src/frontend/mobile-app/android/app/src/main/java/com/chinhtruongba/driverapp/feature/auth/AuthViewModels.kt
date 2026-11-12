package com.chinhtruongba.driverapp.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.R
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

/** zod rules from LoginForm / RegisterForm; values are string resource ids. */
object AuthValidation {
    private val email = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    fun phone(v: String): Int? = if (v.trim().length >= 8) null else R.string.field_phone_error
    fun password(v: String): Int? = if (v.length >= 6) null else R.string.field_password_error
    fun name(v: String): Int? = if (v.trim().length >= 2) null else R.string.field_name_error
    fun email(v: String): Int? = if (email.matches(v.trim())) null else R.string.field_email_error
    fun vehicleType(v: String?): Int? = if (!v.isNullOrBlank()) null else R.string.field_vehicle_type_error
    fun plate(v: String): Int? = if (v.trim().length >= 3) null else R.string.field_plate_error
    fun vehicleName(v: String): Int? = if (v.trim().length >= 2) null else R.string.field_vehicle_name_error
}

val VEHICLE_TYPES = listOf(
    "motorbike" to R.string.vehicle_motorbike,
    "car_4" to R.string.vehicle_car_4,
    "car_7" to R.string.vehicle_car_7,
    "truck" to R.string.vehicle_truck,
)

@HiltViewModel
class ThemeViewModel @Inject constructor(private val prefs: PrefsStore) : ViewModel() {
    val dark: StateFlow<Boolean> = prefs.theme.map { it == ThemeMode.Dark }.stateIn(viewModelScope, SharingStarted.Eagerly, true)
    fun toggle() {
        viewModelScope.launch { prefs.setTheme(if (dark.value) ThemeMode.Light else ThemeMode.Dark) }
    }
}

data class LoginUiState(
    val phone: String = "",
    val password: String = "",
    val phoneError: Int? = null,
    val passwordError: Int? = null,
    val submitting: Boolean = false,
    val failed: Boolean = false,
)

@HiltViewModel
class LoginViewModel @Inject constructor(private val session: SessionRepository) : ViewModel() {
    private val _ui = MutableStateFlow(LoginUiState())
    val ui: StateFlow<LoginUiState> = _ui.asStateFlow()

    fun onPhone(v: String) = _ui.update { it.copy(phone = v, phoneError = null, failed = false) }
    fun onPassword(v: String) = _ui.update { it.copy(password = v, passwordError = null, failed = false) }

    fun submit() {
        val s = _ui.value
        if (s.submitting) return
        val pe = AuthValidation.phone(s.phone)
        val pwe = AuthValidation.password(s.password)
        if (pe != null || pwe != null) {
            _ui.update { it.copy(phoneError = pe, passwordError = pwe) }
            return
        }
        _ui.update { it.copy(submitting = true, failed = false) }
        viewModelScope.launch {
            try {
                session.login(s.phone.trim(), s.password)
                // setTokens → the root swaps to the (app) stack.
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _ui.update { it.copy(submitting = false, failed = true) }
            }
        }
    }
}

data class RegisterUiState(
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val password: String = "",
    val vehicleType: String? = null,
    val plate: String = "",
    val vehicleName: String = "",
    val errors: Map<String, Int> = emptyMap(),
    val submitting: Boolean = false,
    val failed: Boolean = false,
)

@HiltViewModel
class RegisterViewModel @Inject constructor(private val session: SessionRepository) : ViewModel() {
    private val _ui = MutableStateFlow(RegisterUiState())
    val ui: StateFlow<RegisterUiState> = _ui.asStateFlow()
    private var job: Job? = null

    fun update(field: String, value: String) = _ui.update {
        val e = it.errors - field
        when (field) {
            "name" -> it.copy(name = value, errors = e, failed = false)
            "phone" -> it.copy(phone = value, errors = e, failed = false)
            "email" -> it.copy(email = value, errors = e, failed = false)
            "password" -> it.copy(password = value, errors = e, failed = false)
            "vehicleType" -> it.copy(vehicleType = value, errors = e, failed = false)
            "plate" -> it.copy(plate = value, errors = e, failed = false)
            "vehicleName" -> it.copy(vehicleName = value, errors = e, failed = false)
            else -> it
        }
    }

    fun submit() {
        val s = _ui.value
        if (s.submitting) return
        val errors = buildMap {
            AuthValidation.name(s.name)?.let { put("name", it) }
            AuthValidation.phone(s.phone)?.let { put("phone", it) }
            AuthValidation.email(s.email)?.let { put("email", it) }
            AuthValidation.password(s.password)?.let { put("password", it) }
            AuthValidation.vehicleType(s.vehicleType)?.let { put("vehicleType", it) }
            AuthValidation.plate(s.plate)?.let { put("plate", it) }
            AuthValidation.vehicleName(s.vehicleName)?.let { put("vehicleName", it) }
        }
        if (errors.isNotEmpty()) {
            _ui.update { it.copy(errors = errors) }
            return
        }
        _ui.update { it.copy(submitting = true, failed = false) }
        job = viewModelScope.launch {
            try {
                session.register(s.name.trim(), s.phone.trim(), s.email.trim(), s.password, s.vehicleType!!, s.plate.trim(), s.vehicleName.trim())
            } catch (e: CancellationException) {
                // "Huỷ": the aborted request shows no error.
                _ui.update { it.copy(submitting = false, failed = false) }
                throw e
            } catch (_: Exception) {
                _ui.update { it.copy(submitting = false, failed = true) }
            }
        }
    }

    /** While pending, "Huỷ" aborts the request (AbortController). */
    fun cancel() {
        job?.cancel()
        _ui.update { it.copy(submitting = false, failed = false) }
    }
}
