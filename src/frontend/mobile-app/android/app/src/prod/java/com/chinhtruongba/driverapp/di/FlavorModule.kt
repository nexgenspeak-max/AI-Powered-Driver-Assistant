package com.chinhtruongba.driverapp.di

import com.chinhtruongba.driverapp.app.DemoHooks
import com.chinhtruongba.driverapp.feature.location.FusedLocationSource
import com.chinhtruongba.driverapp.feature.location.LocationSource
import com.chinhtruongba.driverapp.feature.voice.AndroidContactsSource
import com.chinhtruongba.driverapp.feature.voice.ContactsSource
import com.chinhtruongba.driverapp.feature.voice.VoiceEngine
import com.chinhtruongba.driverapp.prod.LiveKitVoiceEngine
import com.chinhtruongba.driverapp.prod.NoDemoHooks
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class FlavorModule {
    @Binds abstract fun voice(impl: LiveKitVoiceEngine): VoiceEngine
    @Binds abstract fun location(impl: FusedLocationSource): LocationSource
    @Binds abstract fun contacts(impl: AndroidContactsSource): ContactsSource
    @Binds abstract fun demoHooks(impl: NoDemoHooks): DemoHooks
}
