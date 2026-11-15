package com.chinhtruongba.driverapp.core

import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.storage.EncryptedTokenStore
import com.chinhtruongba.driverapp.core.storage.TokenCipher
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

/** Reversible stand-in for the Keystore cipher; [failEncrypt] simulates a broken Keystore. */
private class FakeCipher(var failEncrypt: Boolean = false) : TokenCipher {
    override fun encrypt(plain: String): String {
        if (failEncrypt) throw IllegalStateException("keystore unavailable")
        return plain.reversed()
    }

    override fun decrypt(encoded: String): String = encoded.reversed()
}

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35])
class EncryptedTokenStoreTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test
    fun `tokens persist, a failed encrypt keeps the session in memory and drops the stale blob`() = runBlocking {
        val cipher = FakeCipher()
        val first = AuthTokens("access-1", "refresh-1")
        EncryptedTokenStore(context, cipher).set(first)
        assertEquals("a new store instance reads the persisted tokens", first, EncryptedTokenStore(context, cipher).also { it.hydrate() }.current())

        // The Keystore breaks while the tokens are rotated.
        cipher.failEncrypt = true
        val store = EncryptedTokenStore(context, cipher)
        val rotated = AuthTokens("access-2", "refresh-2")
        store.set(rotated) // must not throw
        assertEquals("the session stays usable", rotated, store.current())

        cipher.failEncrypt = false
        val afterRestart = EncryptedTokenStore(context, cipher).also { it.hydrate() }
        assertNull("the rotated-away tokens do not come back", afterRestart.current())
    }
}
