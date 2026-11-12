package com.chinhtruongba.driverapp.feature.voice

import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Lets non-UI code ask for a runtime permission lazily: the activity observes [pending],
 * launches the system dialog and calls [complete].
 */
@Singleton
class ContactsPermissionGate @Inject constructor() {
    private val _pending = MutableStateFlow(false)
    val pending: StateFlow<Boolean> = _pending.asStateFlow()
    private var waiter: CompletableDeferred<Boolean>? = null

    suspend fun request(): Boolean {
        val d = waiter ?: CompletableDeferred<Boolean>().also { waiter = it }
        _pending.value = true
        return d.await()
    }

    fun complete(granted: Boolean) {
        _pending.value = false
        waiter?.complete(granted)
        waiter = null
    }
}
