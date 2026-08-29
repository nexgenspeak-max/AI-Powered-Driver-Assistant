const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Native build output isn't JS source and its .cxx temp dirs get created/deleted
// rapidly during CMake configuration — watching them crashes Metro's file watcher
// (ENOENT) if a native build runs at the same time as the dev server.
config.resolver.blockList = [
  /android\/app\/(build|\.cxx)\/.*/,
  /ios\/(build|Pods)\/.*/,
]

// maplibre-gl is `"type": "module"` with no `exports` map. Expo's package-exports
// resolver then fails with "Unable to resolve maplibre-gl" even though dist/ exists.
const maplibreEntry = path.resolve(__dirname, 'node_modules/maplibre-gl/dist/maplibre-gl.js')
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'maplibre-gl') {
    return { type: 'sourceFile', filePath: maplibreEntry }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
