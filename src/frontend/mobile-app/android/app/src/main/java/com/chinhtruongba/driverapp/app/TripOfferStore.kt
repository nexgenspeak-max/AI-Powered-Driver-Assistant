package com.chinhtruongba.driverapp.app

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/** `tripOfferStore {tripId}` — the ringing offer, memory only. */
@Singleton
class TripOfferStore @Inject constructor() {
    private val _tripId = MutableStateFlow<String?>(null)
    val tripId: StateFlow<String?> = _tripId.asStateFlow()
    fun show(id: String) { _tripId.value = id }
    fun dismiss() { _tripId.value = null }
}
