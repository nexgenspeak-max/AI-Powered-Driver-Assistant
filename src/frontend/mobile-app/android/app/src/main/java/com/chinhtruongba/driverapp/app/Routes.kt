package com.chinhtruongba.driverapp.app

import kotlinx.serialization.Serializable

/** Typed Navigation Compose routes. */
sealed interface Route {
    // (auth)
    @Serializable data object Landing : Route
    @Serializable data object Login : Route
    @Serializable data object Register : Route

    // (app) visible tabs
    @Serializable data object Home : Route
    @Serializable data object Trips : Route
    @Serializable data object Earnings : Route
    @Serializable data object Profile : Route

    // (app) hidden routes (href: null)
    @Serializable data object AddTrip : Route
    @Serializable data object EditProfile : Route
    @Serializable data object AssistantSettings : Route
    @Serializable data object Vehicle : Route
    @Serializable data object BankInfo : Route
    @Serializable data object Documents : Route
    @Serializable data object Safety : Route
    @Serializable data object Support : Route
    @Serializable data object Terms : Route
    @Serializable data object About : Route
    @Serializable data object Faq : Route
}

enum class Tab { Home, Trips, Earnings, Profile }

/** Hidden routes highlight their parent tab (parity-map §1). */
fun tabForRoute(qualifiedName: String?): Tab? {
    val n = qualifiedName?.substringAfterLast('.')?.substringBefore('/') ?: return null
    return when (n) {
        "Home" -> Tab.Home
        "Trips", "AddTrip" -> Tab.Trips
        "Earnings" -> Tab.Earnings
        "Profile", "EditProfile", "AssistantSettings", "Vehicle", "BankInfo", "Documents",
        "Safety", "Support", "Terms", "About", "Faq" -> Tab.Profile
        else -> null
    }
}

fun Tab.route(): Route = when (this) {
    Tab.Home -> Route.Home
    Tab.Trips -> Route.Trips
    Tab.Earnings -> Route.Earnings
    Tab.Profile -> Route.Profile
}
