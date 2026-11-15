package com.chinhtruongba.driverapp.feature.voice

import com.chinhtruongba.driverapp.app.PermissionGateway
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withTimeoutOrNull
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Lets non-UI code ask for a runtime permission lazily: the activity observes [pending],
 * launches the system dialog and calls [complete].
 */
@Singleton
class ContactsPermissionGate @Inject constructor(private val gateway: PermissionGateway) {
    private val _pending = MutableStateFlow(false)
    val pending: StateFlow<Boolean> = _pending.asStateFlow()
    private var waiter: CompletableDeferred<Boolean>? = null

    /**
     * Asks through the activity. The agent waits 8 s for `search_contacts`, so the answer must
     * come sooner: with no started activity (a call running under the foreground service only)
     * nobody can be asked and the request is denied at once (`permission_denied`); otherwise a
     * dialog still unanswered after [REQUEST_TIMEOUT_MS] counts as denied for this lookup.
     */
    suspend fun request(): Boolean {
        if (!gateway.hasVisibleActivity) return false
        val d = waiter ?: CompletableDeferred<Boolean>().also { waiter = it }
        _pending.value = true
        val answer = withTimeoutOrNull(REQUEST_TIMEOUT_MS) { d.await() }
        if (answer == null && waiter === d) complete(false)
        return answer ?: false
    }

    fun complete(granted: Boolean) {
        _pending.value = false
        waiter?.complete(granted)
        waiter = null
    }

    companion object {
        const val REQUEST_TIMEOUT_MS = 6_000L
    }
}
