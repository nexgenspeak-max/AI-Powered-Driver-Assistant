import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
}

// Base URLs and the Goong key come from the uncommitted local.properties
// (seeded from driver-app/.env by scripts/seed-local-properties.sh).
val localProps = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}
fun localProp(key: String, default: String): String =
    localProps.getProperty(key)?.takeIf { it.isNotBlank() } ?: default

fun String.quoted() = "\"" + replace("\\", "\\\\").replace("\"", "\\\"") + "\""

android {
    namespace = "com.chinhtruongba.driverapp"
    // compileSdk 37: core-ktx 1.19 and okhttp 5.5 require it; targetSdk stays 36 (Play requirement, D2).
    compileSdk = 37

    defaultConfig {
        applicationId = "com.chinhtruongba.driverapp"
        minSdk = 29
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        buildConfigField("String", "TRIP_SERVICE_URL", localProp("czen.tripServiceUrl", "http://10.0.2.2:8002/api/v1").quoted())
        buildConfigField("String", "AUTH_SERVICE_URL", localProp("czen.authServiceUrl", "http://10.0.2.2:8003/api/v1").quoted())
        buildConfigField("String", "TRIP_SERVICE_WS_URL", localProp("czen.tripServiceWsUrl", "").quoted())
        buildConfigField("String", "GOONG_MAPS_KEY", localProp("czen.goongMapsKey", "").quoted())

        ndk {
            // LiveKit/WebRTC, MapLibre and Vosk ship native code; keep the
            // ABIs real devices and the Apple-silicon emulator use.
            abiFilters += listOf("arm64-v8a", "x86_64")
        }
    }

    flavorDimensions += "data"
    productFlavors {
        create("demo") {
            dimension = "data"
            applicationIdSuffix = ".demo"
            versionNameSuffix = "-demo"
            buildConfigField("boolean", "DEMO", "true")
        }
        create("prod") {
            dimension = "data"
            buildConfigField("boolean", "DEMO", "false")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            // Signing comes from the environment / ~/.gradle/gradle.properties; local builds
            // reuse the debug key so `assembleProdRelease` still produces an installable APK.
            signingConfig = signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    androidResources {
        generateLocaleConfig = true
        // The Vosk model directory is copied verbatim into assets.
        noCompress += listOf("mdl", "fst", "conf", "int", "mat", "dubm", "ie", "stats")
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
            isReturnDefaultValues = true
        }
    }

    packaging {
        resources {
            excludes += listOf("/META-INF/{AL2.0,LGPL2.1}", "/META-INF/versions/9/OSGI-INF/MANIFEST.MF")
        }
    }

    lint {
        warningsAsErrors = false
        abortOnError = true
        checkDependencies = false
        error += listOf("HardcodedText")
        // Vietnamese is the only shipped language (parity with the RN app, which hard-codes vi).
        disable += listOf(
            // Vietnamese is the only shipped language (the RN app hard-codes vi).
            "MissingTranslation",
            // Vietnamese has a single plural form, so "%d chuyến" needs no <plurals>.
            "PluralsCandidate",
            // Copy is verbatim from the RN app ("...", "-") per the parity map.
            "TypographyEllipsis",
            "TypographyDashes",
            // targetSdk 36 is the D2 decision (Play's current requirement); compileSdk is 37.
            "OldTargetApi",
            // Versions are pinned and verified in the catalog on purpose.
            "GradleDependency",
            "NewerVersionAvailable",
            "AndroidGradlePluginVersion",
        )
    }
}

// The Vosk wake-word model is not duplicated in git: it is synced from the RN
// app's assets into a generated assets folder at build time.
abstract class SyncVoskModel : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val modelDir: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @get:Inject
    abstract val fs: FileSystemOperations

    @TaskAction
    fun sync() {
        fs.sync {
            from(modelDir)
            into(outputDir.dir("model-en-us"))
        }
    }
}

val syncVoskModel = tasks.register<SyncVoskModel>("syncVoskModel") {
    modelDir.set(rootProject.layout.projectDirectory.dir("../../driver-app/assets/model-en-us"))
    outputDir.set(layout.buildDirectory.dir("generated/vosk-assets"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(syncVoskModel, SyncVoskModel::outputDir)
    }
}

kotlin {
    jvmToolchain(17)
    compilerOptions {
        optIn.addAll(
            "androidx.compose.material3.ExperimentalMaterial3Api",
            "androidx.compose.foundation.layout.ExperimentalLayoutApi",
            "kotlinx.coroutines.ExperimentalCoroutinesApi",
            "kotlinx.serialization.ExperimentalSerializationApi",
        )
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.animation)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.process)
    implementation(libs.androidx.lifecycle.service)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.datastore.preferences)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.androidx.hilt.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx.serialization)
    implementation(libs.okhttp)
    implementation(libs.haze)
    implementation(libs.haze.blur)
    implementation(libs.haze.glass)
    implementation(libs.livekit.android)
    implementation(libs.maplibre.android)
    implementation(libs.vosk.android)
    implementation(libs.play.services.location)

    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.turbine)
    testImplementation(libs.okhttp.mockwebserver)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.androidx.test.ext.junit)
    testImplementation(platform(libs.androidx.compose.bom))
    testImplementation(libs.androidx.compose.ui.test.junit4)

    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.runner)
}
