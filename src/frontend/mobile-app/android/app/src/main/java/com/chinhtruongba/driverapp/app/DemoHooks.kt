package com.chinhtruongba.driverapp.app

/** Demo-flavor affordances reachable from deep links; no-ops in prod. */
interface DemoHooks {
    val isDemo: Boolean
    fun triggerOffer()
}
