package com.chinhtruongba.driverapp.app

/** Demo-flavor affordances reachable from deep links; no-ops in prod. */
interface DemoHooks {
    val isDemo: Boolean
    fun triggerOffer()

    /** Moves the demo GPS position (the home map follows it), e.g. for label screenshots. */
    fun moveTo(lat: Double, lng: Double) = Unit
}
