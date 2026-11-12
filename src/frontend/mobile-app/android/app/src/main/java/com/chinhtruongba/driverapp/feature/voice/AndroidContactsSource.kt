package com.chinhtruongba.driverapp.feature.voice

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.provider.ContactsContract
import androidx.core.content.ContextCompat
import com.chinhtruongba.driverapp.di.IoDispatcher
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * `search_contacts` RPC backend (contactsSearch.ts): name search, first number per contact,
 * max 5. READ_CONTACTS is requested lazily by the UI the first time the agent asks.
 */
@Singleton
class AndroidContactsSource @Inject constructor(
    @ApplicationContext private val context: Context,
    @param:IoDispatcher private val io: CoroutineDispatcher,
    private val permissionGate: ContactsPermissionGate,
) : ContactsSource {
    override suspend fun search(query: String): List<ContactMatch> {
        if (!granted() && !permissionGate.request()) throw ContactsPermissionDenied()
        return withContext(io) {
            val out = LinkedHashMap<String, ContactMatch>()
            val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
            val proj = arrayOf(
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID,
                ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                ContactsContract.CommonDataKinds.Phone.NUMBER,
            )
            context.contentResolver.query(
                uri,
                proj,
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?",
                arrayOf("%${query.trim()}%"),
                "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC",
            )?.use { c ->
                while (c.moveToNext() && out.size < 5) {
                    val id = c.getString(0) ?: continue
                    if (out.containsKey(id)) continue
                    out[id] = ContactMatch(c.getString(1).orEmpty(), c.getString(2).orEmpty())
                }
            }
            out.values.toList()
        }
    }

    private fun granted() = ContextCompat.checkSelfPermission(context, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
}
