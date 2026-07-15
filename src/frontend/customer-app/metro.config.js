const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// Native build output isn't JS source and its .cxx temp dirs get created/deleted
// rapidly during CMake configuration — watching them crashes Metro's file watcher
// (ENOENT) if a native build runs at the same time as the dev server.
config.resolver.blockList = [
  /android\/app\/(build|\.cxx)\/.*/,
  /ios\/(build|Pods)\/.*/,
]

module.exports = withNativeWind(config, { input: './global.css' })
