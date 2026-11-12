package com.chinhtruongba.driverapp.di

import com.chinhtruongba.driverapp.app.DemoHooks
import com.chinhtruongba.driverapp.core.network.AuthApi
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.realtime.DispatchSocket
import com.chinhtruongba.driverapp.demo.DemoHooksImpl
import com.chinhtruongba.driverapp.demo.FakeBackend
import com.chinhtruongba.driverapp.demo.FakeContactsSource
import com.chinhtruongba.driverapp.demo.FakeLocationSource
import com.chinhtruongba.driverapp.demo.FakeVoiceEngine
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.voice.ContactsSource
import com.chinhtruongba.driverapp.feature.voice.VoiceEngine
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

/** Demo flavor (D9): every backend and device source is a bundled fake — no network needed. */
@Module
@InstallIn(SingletonComponent::class)
abstract class FlavorModule {
    @Binds abstract fun authApi(impl: FakeBackend): AuthApi
    @Binds abstract fun tripApi(impl: FakeBackend): TripApi
    @Binds abstract fun socket(impl: FakeBackend): DispatchSocket
    @Binds abstract fun voice(impl: FakeVoiceEngine): VoiceEngine
    @Binds abstract fun location(impl: FakeLocationSource): LocationSource
    @Binds abstract fun contacts(impl: FakeContactsSource): ContactsSource
    @Binds abstract fun demoHooks(impl: DemoHooksImpl): DemoHooks
}
