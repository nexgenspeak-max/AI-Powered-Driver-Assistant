package com.chinhtruongba.driverapp.core.storage

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.ThemeMode
import com.chinhtruongba.driverapp.core.model.VoiceLang
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

private val Context.secureStore: DataStore<Preferences> by preferencesDataStore(name = "secure")
private val Context.prefsStore: DataStore<Preferences> by preferencesDataStore(name = "prefs")

/** Session tokens. The in-memory copy is what the OkHttp layer reads synchronously. */
interface TokenStore {
    val tokens: StateFlow<AuthTokens?>
    val hydrated: StateFlow<Boolean>
    suspend fun hydrate()
    suspend fun set(tokens: AuthTokens)
    suspend fun clear()
    fun current(): AuthTokens? = tokens.value
}

/** Same persisted shape as the RN zustand store: `{state:{accessToken,refreshToken},version}`. */
@Serializable
private data class PersistedAuth(val state: PersistedTokens, val version: Int = 0)

@Serializable
private data class PersistedTokens(val accessToken: String? = null, val refreshToken: String? = null)

/** AES-256-GCM with a non-exportable Android Keystore key. */
class KeystoreCipher(private val alias: String = "czen-driver-auth") {
    private fun key(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getEntry(alias, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build(),
        )
        return gen.generateKey()
    }

    fun encrypt(plain: String): String {
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.ENCRYPT_MODE, key())
        val out = c.iv + c.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(out, Base64.NO_WRAP)
    }

    fun decrypt(encoded: String): String {
        val bytes = Base64.decode(encoded, Base64.NO_WRAP)
        val c = Cipher.getInstance("AES/GCM/NoPadding")
        c.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes, 0, 12))
        return String(c.doFinal(bytes, 12, bytes.size - 12), Charsets.UTF_8)
    }
}

@Singleton
class EncryptedTokenStore @Inject constructor(@ApplicationContext private val context: Context) : TokenStore {
    private val key = stringPreferencesKey("driver-auth-tokens")
    private val cipher = KeystoreCipher()
    private val json = Json { ignoreUnknownKeys = true }
    private val _tokens = MutableStateFlow<AuthTokens?>(null)
    private val _hydrated = MutableStateFlow(false)
    override val tokens: StateFlow<AuthTokens?> = _tokens.asStateFlow()
    override val hydrated: StateFlow<Boolean> = _hydrated.asStateFlow()

    override suspend fun hydrate() {
        if (_hydrated.value) return
        val blob = context.secureStore.data.first()[key]
        _tokens.value = blob?.let {
            runCatching {
                val p = json.decodeFromString(PersistedAuth.serializer(), cipher.decrypt(it)).state
                if (p.accessToken != null && p.refreshToken != null) AuthTokens(p.accessToken, p.refreshToken) else null
            }.getOrNull()
        }
        _hydrated.value = true
    }

    override suspend fun set(tokens: AuthTokens) {
        _tokens.value = tokens
        val blob = cipher.encrypt(json.encodeToString(PersistedAuth.serializer(), PersistedAuth(PersistedTokens(tokens.accessToken, tokens.refreshToken))))
        context.secureStore.edit { it[key] = blob }
    }

    override suspend fun clear() {
        _tokens.value = null
        context.secureStore.edit { it.remove(key) }
    }
}

/** Local (non-server) preferences — MMKV keys in the RN app. */
interface PrefsStore {
    val theme: Flow<ThemeMode>
    val voiceLang: Flow<VoiceLang>
    val wakeWordEnabled: Flow<Boolean>
    suspend fun setTheme(mode: ThemeMode)
    suspend fun setVoiceLang(lang: VoiceLang)
    suspend fun setWakeWordEnabled(enabled: Boolean)
    suspend fun voiceLangNow(): VoiceLang = voiceLang.first()
}

@Singleton
class DataStorePrefs @Inject constructor(@ApplicationContext private val context: Context) : PrefsStore {
    // Stored with the RN persist shape `{state, version}` under the same key names.
    private val themeKey = stringPreferencesKey("theme-settings")
    private val langKey = stringPreferencesKey("voice-lang-settings")
    private val wakeKey = stringPreferencesKey("wakeword-settings")

    override val theme: Flow<ThemeMode> = context.prefsStore.data.map { p ->
        if (p[themeKey]?.contains("\"light\"") == true) ThemeMode.Light else ThemeMode.Dark
    }
    override val voiceLang: Flow<VoiceLang> = context.prefsStore.data.map { p ->
        VoiceLang.resolve(p[langKey]?.let { Regex("\"lang\"\\s*:\\s*\"(\\w+)\"").find(it)?.groupValues?.get(1) })
    }
    override val wakeWordEnabled: Flow<Boolean> = context.prefsStore.data.map { p ->
        p[wakeKey]?.contains("\"enabled\":true") == true
    }

    override suspend fun setTheme(mode: ThemeMode) {
        val v = if (mode == ThemeMode.Light) "light" else "dark"
        context.prefsStore.edit { it[themeKey] = """{"state":{"mode":"$v"},"version":0}""" }
    }

    override suspend fun setVoiceLang(lang: VoiceLang) {
        context.prefsStore.edit { it[langKey] = """{"state":{"lang":"${lang.routing}"},"version":1}""" }
    }

    override suspend fun setWakeWordEnabled(enabled: Boolean) {
        context.prefsStore.edit { it[wakeKey] = """{"state":{"enabled":$enabled},"version":0}""" }
    }
}
