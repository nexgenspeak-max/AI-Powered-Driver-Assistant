package com.chinhtruongba.driverapp.app

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class DeepLinkPolicyTest {
    @Test
    fun `dev-login only in debug builds, even for the demo flavor`() {
        assertTrue(DeepLinkPolicy.allows(listOf("dev-login"), debug = true, demo = false))
        assertTrue(DeepLinkPolicy.allows(listOf("dev-login"), debug = true, demo = true))
        assertFalse(DeepLinkPolicy.allows(listOf("dev-login"), debug = false, demo = true))
        assertFalse(DeepLinkPolicy.allows(listOf("dev-login"), debug = false, demo = false))
    }

    @Test
    fun `demo links need the demo flavor`() {
        for (p in listOf(listOf("demo", "offer"), listOf("demo", "theme"), listOf("demo", "chat"))) {
            assertTrue(DeepLinkPolicy.allows(p, debug = false, demo = true))
            assertFalse(DeepLinkPolicy.allows(p, debug = true, demo = false))
        }
    }

    @Test
    fun `dev-say and open stay debug-or-demo, unknown links are refused`() {
        assertTrue(DeepLinkPolicy.allows(listOf("open", "trips"), debug = false, demo = true))
        assertTrue(DeepLinkPolicy.allows(listOf("dev-say"), debug = true, demo = false))
        assertFalse(DeepLinkPolicy.allows(listOf("open", "trips"), debug = false, demo = false))
        assertFalse(DeepLinkPolicy.allows(listOf("dev-say"), debug = false, demo = false))
        assertFalse(DeepLinkPolicy.allows(listOf("anything"), debug = true, demo = true))
        assertFalse(DeepLinkPolicy.allows(emptyList(), debug = true, demo = true))
    }
}
