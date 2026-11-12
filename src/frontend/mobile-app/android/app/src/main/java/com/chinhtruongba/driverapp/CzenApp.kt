package com.chinhtruongba.driverapp

import android.app.Application
import com.chinhtruongba.driverapp.app.AppCoordinator
import com.chinhtruongba.driverapp.feature.location.BackgroundLocationCoordinator
import com.chinhtruongba.driverapp.feature.wakeword.WakeWordCoordinator
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class CzenApp : Application() {
    @Inject lateinit var coordinator: AppCoordinator
    @Inject lateinit var backgroundLocation: BackgroundLocationCoordinator
    @Inject lateinit var wakeWord: WakeWordCoordinator

    override fun onCreate() {
        super.onCreate()
        coordinator.start()
        backgroundLocation.start()
        wakeWord.start()
    }
}
