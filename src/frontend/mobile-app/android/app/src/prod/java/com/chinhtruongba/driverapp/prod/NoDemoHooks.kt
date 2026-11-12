package com.chinhtruongba.driverapp.prod

import com.chinhtruongba.driverapp.app.DemoHooks
import javax.inject.Inject

class NoDemoHooks @Inject constructor() : DemoHooks {
    override val isDemo: Boolean = false
    override fun triggerOffer() = Unit
}
