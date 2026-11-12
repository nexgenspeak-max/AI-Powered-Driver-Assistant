package com.chinhtruongba.driverapp.core.storage

import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Monotonic session counter. Logout bumps it; work that started under an older generation
 * (a token refresh in flight) must not write session state back. [invalidate] and
 * [runIfCurrent] share a lock, so the check and the write are atomic with respect to logout.
 */
@Singleton
class SessionGeneration @Inject constructor() {
    private val lock = Mutex()

    @Volatile
    var value: Long = 0
        private set

    /** Starts a new generation, then runs [then] (e.g. clearing tokens) under the same lock. */
    suspend fun invalidate(then: suspend () -> Unit = {}) = lock.withLock {
        value++
        then()
    }

    /** Runs [block] only when the session is still [expected]; false when it moved on. */
    suspend fun runIfCurrent(expected: Long, block: suspend () -> Boolean): Boolean = lock.withLock {
        value == expected && block()
    }
}
