package com.chinhtruongba.driverapp.di

import com.chinhtruongba.driverapp.feature.voice.AndroidFillerAudio
import com.chinhtruongba.driverapp.feature.voice.FillerAudio
import com.chinhtruongba.driverapp.feature.voice.ForegroundController
import com.chinhtruongba.driverapp.service.ServiceForegroundController
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
abstract class FeatureModule {
    @Binds abstract fun filler(impl: AndroidFillerAudio): FillerAudio
    @Binds abstract fun foreground(impl: ServiceForegroundController): ForegroundController
}
