package com.chinhtruongba.driverapp

import android.Manifest
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.CompositionLocalProvider
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.lifecycleScope
import com.chinhtruongba.driverapp.app.AppRoot
import com.chinhtruongba.driverapp.app.DeepLinks
import com.chinhtruongba.driverapp.app.LocalPermissions
import com.chinhtruongba.driverapp.app.PermissionRequester
import com.chinhtruongba.driverapp.feature.location.LocationTracker
import com.chinhtruongba.driverapp.feature.voice.ContactsPermissionGate
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var deepLinks: DeepLinks
    @Inject lateinit var contactsGate: ContactsPermissionGate
    @Inject lateinit var location: LocationTracker

    private lateinit var permissions: PermissionRequester

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        permissions = PermissionRequester(this) { result ->
            // Start the live watch as soon as location is granted, not on the next onStart.
            if (result[Manifest.permission.ACCESS_FINE_LOCATION] == true || result[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
                location.onLocationPermissionChanged()
            }
        }

        // Contacts are requested lazily, the first time the agent calls search_contacts.
        lifecycleScope.launch {
            contactsGate.pending.collect { pending ->
                if (pending) permissions.request(arrayOf(Manifest.permission.READ_CONTACTS)) { contactsGate.complete(it) }
            }
        }
        // Foreground live location watch only while the activity is visible; LocationTracker also
        // follows SessionRepository.loggedIn, so it stops on logout even while visible.
        lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) = location.onForeground()
            override fun onStop(owner: LifecycleOwner) = location.onBackground()
        })

        setContent {
            CompositionLocalProvider(LocalPermissions provides permissions) { AppRoot() }
        }
        intent?.let(deepLinks::handle)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        deepLinks.handle(intent)
    }
}
