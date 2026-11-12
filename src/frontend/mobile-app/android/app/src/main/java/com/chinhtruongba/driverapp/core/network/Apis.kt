package com.chinhtruongba.driverapp.core.network

import com.chinhtruongba.driverapp.core.model.AccountSettings
import com.chinhtruongba.driverapp.core.model.AuthTokens
import com.chinhtruongba.driverapp.core.model.AuthUser
import com.chinhtruongba.driverapp.core.model.CreateTripRequest
import com.chinhtruongba.driverapp.core.model.DriverContext
import com.chinhtruongba.driverapp.core.model.DriverProfile
import com.chinhtruongba.driverapp.core.model.EarningsSummary
import com.chinhtruongba.driverapp.core.model.NavigationRoute
import com.chinhtruongba.driverapp.core.model.RegisterResponse
import com.chinhtruongba.driverapp.core.model.Trip
import com.chinhtruongba.driverapp.core.model.VoiceToken
import kotlinx.serialization.json.JsonObject
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Identity service (`EXPO_PUBLIC_AUTH_SERVICE_URL`). */
interface AuthApi {
    @POST("auth/login")
    suspend fun login(@Body body: JsonObject): AuthTokens

    @POST("auth/register")
    suspend fun register(@Body body: JsonObject): RegisterResponse

    @GET("auth/me")
    suspend fun me(): AuthUser

    @PATCH("accounts/{id}")
    suspend fun updateAccount(@Path("id") id: String, @Body body: JsonObject): AuthUser

    @GET("settings/{accountId}")
    suspend fun settings(@Path("accountId") accountId: String): AccountSettings

    @PATCH("settings/{accountId}")
    suspend fun updateSettings(@Path("accountId") accountId: String, @Body body: JsonObject): AccountSettings
}

/** Refresh lives on its own client without the authenticator, so it can never recurse. */
interface RefreshApi {
    @POST("auth/refresh")
    suspend fun refresh(@Body body: JsonObject): AuthTokens
}

/** External-api / trip service (`EXPO_PUBLIC_TRIP_SERVICE_URL`). */
interface TripApi {
    @PATCH("drivers/{phone}")
    suspend fun updateDriver(@Path("phone") phone: String, @Body body: JsonObject): JsonObject

    @GET("drivers/me/context")
    suspend fun context(@Query("fresh") fresh: Boolean? = null): DriverContext

    @GET("drivers/me/profile")
    suspend fun profile(): DriverProfile

    @GET("drivers/me/earnings/summary")
    suspend fun earningsSummary(@Query("period") period: String): EarningsSummary

    @POST("drivers/me/location")
    suspend fun pushLocation(@Body body: JsonObject): JsonObject

    @POST("drivers/me/location/live")
    suspend fun pushLiveLocation(@Body body: JsonObject): JsonObject

    @GET("drivers/me/navigation")
    suspend fun navigation(
        @Query("from_lat") fromLat: Double,
        @Query("from_lng") fromLng: Double,
        @Query("to_lat") toLat: Double,
        @Query("to_lng") toLng: Double,
    ): NavigationRoute

    @GET("trips/{id}")
    suspend fun trip(@Path("id") id: String): Trip

    @POST("trips")
    suspend fun createTrip(@Body body: CreateTripRequest): Trip

    @PATCH("trips/{id}")
    suspend fun updateTrip(@Path("id") id: String, @Body body: JsonObject): Trip

    @POST("voice/token")
    suspend fun voiceToken(@Query("driver_phone") phone: String, @Query("lang") lang: String): VoiceToken
}
