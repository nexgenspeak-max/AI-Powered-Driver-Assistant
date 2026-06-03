import { registerGlobals } from '@livekit/react-native'
import { registerRootComponent } from 'expo'
import App from './App'

// Required before any LiveKit / WebRTC usage (mic publish, audio playback).
registerGlobals()

registerRootComponent(App)
