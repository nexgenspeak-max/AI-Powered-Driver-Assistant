import { Platform } from 'react-native'
import { StateStorage } from 'zustand/middleware'

// Access/refresh tokens are real bearer credentials (a stolen refresh token
// is a long-lived account takeover), so they get the OS Keychain/Keystore
// via expo-secure-store instead of MMKV — MMKV/AsyncStorage are unencrypted
// plain files, readable from a device backup or a rooted/jailbroken device.
// Everything else the app persists (theme, wakeword settings, ...) stays on
// the fast MMKV-backed `storage.ts` since none of it is a credential.
// SecureStore has no web implementation, so web keeps using localStorage —
// same trade-off `storage.ts` already makes (there's no OS keychain in a
// browser tab either way).
let storage: StateStorage

if (Platform.OS === 'web') {
  storage = {
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: key => localStorage.removeItem(key),
  }
} else {
  const SecureStore = require('expo-secure-store')
  storage = {
    getItem: key => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: key => SecureStore.deleteItemAsync(key),
  }
}

export { storage as secureTokenStorage }
