package com.chinhtruongba.driverapp.feature.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.model.DriverProfile
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.storage.PrefsStore
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import javax.inject.Inject

data class ProfileUiState(
    val user: AuthUser? = null,
    val online: Boolean = false,
    val profile: DriverProfile? = null,
    val loading: Boolean = true,
    val error: Boolean = false,
    val dark: Boolean = true,
    val confirmLogout: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val session: SessionRepository,
    private val drivers: DriverRepository,
    private val prefs: PrefsStore,
) : ViewModel() {
    private val confirm = MutableStateFlow(false)

    val ui: StateFlow<ProfileUiState> = combine(session.me, drivers.context, prefs.theme, confirm) { me, ctx, theme, c ->
        ProfileUiState(
            user = me.data,
            online = me.data?.isOnline == true,
            profile = ctx.data?.driverProfile,
            loading = ctx.data == null && (ctx.loading || me.data == null),
            error = ctx.data == null && ctx.error != null,
            dark = theme == ThemeMode.Dark,
            confirmLogout = c,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProfileUiState())

    init {
        drivers.ensureFresh()
    }

    fun retry() = drivers.invalidate()
    fun toggleTheme() {
        viewModelScope.launch { prefs.setTheme(if (ui.value.dark) ThemeMode.Light else ThemeMode.Dark) }
    }
    fun askLogout() { confirm.value = true }
    fun dismissLogout() { confirm.value = false }
    fun logout() {
        confirm.value = false
        viewModelScope.launch { session.logout() }
    }
}

/** Result of a save: an alert to show. */
enum class SaveResult { Saved, Failed }

data class EditProfileUiState(
    val user: AuthUser? = null,
    val name: String = "",
    val saving: Boolean = false,
    val result: SaveResult? = null,
) {
    val canSave: Boolean get() = !saving && name.isNotBlank() && name.trim() != user?.name
}

@HiltViewModel
class EditProfileViewModel @Inject constructor(private val session: SessionRepository) : ViewModel() {
    private val _ui = MutableStateFlow(EditProfileUiState())
    val ui: StateFlow<EditProfileUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            session.me.collect { me ->
                val u = me.data ?: return@collect
                _ui.update { s -> if (s.user == null) s.copy(user = u, name = u.name) else s.copy(user = u) }
            }
        }
    }

    fun onName(v: String) = _ui.update { it.copy(name = v) }
    fun dismiss() = _ui.update { it.copy(result = null) }

    fun save() {
        if (!_ui.value.canSave) return
        _ui.update { it.copy(saving = true) }
        viewModelScope.launch {
            try {
                session.updateAccount(buildJsonObject { put("name", _ui.value.name.trim()) })
                _ui.update { it.copy(saving = false, result = SaveResult.Saved) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _ui.update { it.copy(saving = false, result = SaveResult.Failed) }
            }
        }
    }
}

data class VehicleUiState(
    val user: AuthUser? = null,
    val type: String? = null,
    val name: String = "",
    val plate: String = "",
    val saving: Boolean = false,
    val result: SaveResult? = null,
) {
    val changed: Boolean
        get() = user != null && (type != user.vehicleType || name.trim() != (user.vehicleName ?: "") || plate.trim() != (user.vehiclePlate ?: ""))
}

@HiltViewModel
class VehicleViewModel @Inject constructor(
    private val session: SessionRepository,
    private val drivers: DriverRepository,
) : ViewModel() {
    private val _ui = MutableStateFlow(VehicleUiState())
    val ui: StateFlow<VehicleUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch {
            session.me.collect { me ->
                val u = me.data ?: return@collect
                _ui.update { s ->
                    if (s.user == null) s.copy(user = u, type = u.vehicleType, name = u.vehicleName.orEmpty(), plate = u.vehiclePlate.orEmpty()) else s.copy(user = u)
                }
            }
        }
    }

    fun onType(v: String) = _ui.update { it.copy(type = v) }
    fun onName(v: String) = _ui.update { it.copy(name = v) }
    fun onPlate(v: String) = _ui.update { it.copy(plate = v.uppercase()) }
    fun dismiss() = _ui.update { it.copy(result = null) }

    fun save() {
        val s = _ui.value
        if (!s.changed || s.saving) return
        _ui.update { it.copy(saving = true) }
        viewModelScope.launch {
            try {
                session.updateAccount(
                    buildJsonObject {
                        put("vehicle_type", s.type)
                        put("vehicle_plate", s.plate.trim())
                        put("vehicle_name", s.name.trim())
                    },
                )
                drivers.invalidate()
                _ui.update { it.copy(saving = false, result = SaveResult.Saved) }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _ui.update { it.copy(saving = false, result = SaveResult.Failed) }
            }
        }
    }
}
