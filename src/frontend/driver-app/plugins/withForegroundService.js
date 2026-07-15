const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins')

// Keeps the LiveKit voice call alive when the app is backgrounded, per
// LiveKit's own guidance (@livekit/react-native README > Background Processing).
function withForegroundService(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    'android.permission.POST_NOTIFICATIONS',
  ])

  return withAndroidManifest(config, config => {
    const app = config.modResults.manifest.application[0]
    app.service = app.service ?? []
    app.service.push(
      {
        $: {
          'android:name': 'com.supersami.foregroundservice.ForegroundService',
          'android:foregroundServiceType': 'microphone',
        },
      },
      {
        $: {
          'android:name': 'com.supersami.foregroundservice.ForegroundServiceTask',
        },
      },
    )
    return config
  })
}

module.exports = withForegroundService
