package com.chinhtruongba.driverapp.di

import com.chinhtruongba.driverapp.BuildConfig
import com.chinhtruongba.driverapp.core.data.SessionRepository
import com.chinhtruongba.driverapp.core.network.AuthApi
import com.chinhtruongba.driverapp.core.network.AuthHeaderInterceptor
import com.chinhtruongba.driverapp.core.network.RefreshApi
import com.chinhtruongba.driverapp.core.network.RefreshAuthenticator
import com.chinhtruongba.driverapp.core.network.TokenRefresher
import com.chinhtruongba.driverapp.core.network.TripApi
import com.chinhtruongba.driverapp.core.network.refreshBody
import com.chinhtruongba.driverapp.core.realtime.DispatchSocket
import com.chinhtruongba.driverapp.core.realtime.OkHttpDispatchSocket
import com.chinhtruongba.driverapp.core.storage.TokenStore
import dagger.Lazy
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

/** Real backend: Retrofit/OkHttp against the URLs from local.properties. */
@Module
@InstallIn(SingletonComponent::class)
object ApiModule {
    private fun String.slash() = if (endsWith("/")) this else "$this/"

    @Provides
    @Singleton
    fun refreshApi(json: Json): RefreshApi = Retrofit.Builder()
        .baseUrl(BuildConfig.AUTH_SERVICE_URL.slash())
        .client(OkHttpClient.Builder().connectTimeout(15, TimeUnit.SECONDS).build())
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(RefreshApi::class.java)

    @Provides
    @Singleton
    fun tokenRefresher(tokens: TokenStore, refreshApi: RefreshApi, session: Lazy<SessionRepository>): TokenRefresher =
        TokenRefresher(
            tokenStore = tokens,
            refresh = { rt -> refreshApi.refresh(refreshBody(rt)) },
            onLogout = { session.get().logoutAndReset() },
        )

    @Provides
    @Singleton
    @Named("auth")
    fun authClient(tokens: TokenStore, refresher: TokenRefresher): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(AuthHeaderInterceptor(tokens) { null })
        .authenticator(RefreshAuthenticator(refresher))
        .build()

    @Provides
    @Singleton
    @Named("trip")
    fun tripClient(tokens: TokenStore, refresher: TokenRefresher, session: Lazy<SessionRepository>): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .addInterceptor(AuthHeaderInterceptor(tokens) { session.get().currentPhone() })
        .authenticator(RefreshAuthenticator(refresher))
        .build()

    @Provides
    @Singleton
    fun authApi(@Named("auth") client: OkHttpClient, json: Json): AuthApi = Retrofit.Builder()
        .baseUrl(BuildConfig.AUTH_SERVICE_URL.slash())
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(AuthApi::class.java)

    @Provides
    @Singleton
    fun tripApi(@Named("trip") client: OkHttpClient, json: Json): TripApi = Retrofit.Builder()
        .baseUrl(BuildConfig.TRIP_SERVICE_URL.slash())
        .client(client)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(TripApi::class.java)

    @Provides
    @Singleton
    fun dispatchSocket(@Named("trip") client: OkHttpClient, json: Json): DispatchSocket =
        OkHttpDispatchSocket(client, json, wsUrl())

    /** `EXPO_PUBLIC_TRIP_SERVICE_WS_URL`, else http→ws, strip `/api/v1`, append `/ws`. */
    fun wsUrl(): String = BuildConfig.TRIP_SERVICE_WS_URL.ifBlank {
        BuildConfig.TRIP_SERVICE_URL.replaceFirst(Regex("^http"), "ws").replace(Regex("/api/v1/?$"), "").trimEnd('/') + "/ws"
    }
}
