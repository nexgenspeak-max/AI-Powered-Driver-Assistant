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

    // Required by NotificationConfig.getChannelName()/getChannelDescription()
    // (android/.../NotificationConfig.java) — without these, Bundle.getString()
    // on the missing manifest key silently returns null (no exception, so the
    // library's own "fall back to default" branch never runs), the channel
    // gets created with a null name, and NotificationManager.createNotification
    // Channel() throws IllegalArgumentException on every start() call.
    app['meta-data'] = app['meta-data'] ?? []
    app['meta-data'].push(
      {
        $: {
          'android:name': 'com.supersami.foregroundservice.notification_channel_name',
          'android:value': 'Czen Driver',
        },
      },
      {
        $: {
          'android:name': 'com.supersami.foregroundservice.notification_channel_description',
          'android:value': 'Trạng thái trợ lý AI và cuộc gọi',
        },
      },
    )

    return config
  })
}

module.exports = withForegroundService
