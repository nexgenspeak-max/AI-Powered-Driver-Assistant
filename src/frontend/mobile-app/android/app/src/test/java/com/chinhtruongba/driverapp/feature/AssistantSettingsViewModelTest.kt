package com.chinhtruongba.driverapp.feature

import androidx.lifecycle.viewModelScope
import com.chinhtruongba.driverapp.core.FakeTokenStore
import com.chinhtruongba.driverapp.core.data.DriverRepository
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import com.chinhtruongba.driverapp.feature.settings.AssistantSettingsViewModel
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AssistantSettingsViewModelTest {
    @Test
    fun `a failed settings load shows an error that retry clears`() = runMainTest {
        val auth = FakeAuthApi().apply { failSettings = true }
        val trip = FakeTripApi()
        val session = SessionRepository(FakeTokenStore(AuthTokens("a", "r")), auth, trip, backgroundScope)
        val drivers = DriverRepository(trip, session, backgroundScope)
        session.refreshMe()
        val vm = AssistantSettingsViewModel(session, FakePrefs(), LocationTracker(FixedLocationSource(), drivers, session, backgroundScope))
        backgroundScope.launch { vm.ui.collect { } }
        runCurrent()

        assertTrue("not an endless skeleton", vm.ui.value.loadError)
        assertFalse(vm.ui.value.loaded)

        auth.failSettings = false
        vm.retry()
        runCurrent()
        assertFalse(vm.ui.value.loadError)
        assertTrue(vm.ui.value.loaded)
        vm.viewModelScope.cancel()
    }
}
