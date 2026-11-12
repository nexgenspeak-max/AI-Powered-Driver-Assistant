package com.chinhtruongba.driverapp.app

import com.chinhtruongba.driverapp.designsystem.motion.isReduceMotion
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ReduceMotionTest {
    @Test
    fun `animator duration scale 0 means static, anything else animates`() {
        assertTrue(isReduceMotion(0f))
        assertFalse(isReduceMotion(0.5f))
        assertFalse(isReduceMotion(1f))
    }
}
