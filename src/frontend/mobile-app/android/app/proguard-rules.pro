# kotlinx.serialization
-keepattributes *Annotation*, InnerClasses
-keepclassmembers @kotlinx.serialization.Serializable class ** { *** Companion; *; }
# LiveKit / WebRTC
-keep class org.webrtc.** { *; }
-keep class io.livekit.** { *; }
# Vosk (JNA)
-keep class com.sun.jna.** { *; }
-keep class org.vosk.** { *; }
-dontwarn java.awt.**
# MapLibre
-keep class org.maplibre.** { *; }
