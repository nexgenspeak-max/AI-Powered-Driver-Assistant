import { Platform } from 'react-native'
import { StateStorage } from 'zustand/middleware'

// MMKV for native, localStorage for web
let storage: StateStorage

if (Platform.OS === 'web') {
  storage = {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
  }
} else {
  const { MMKV } = require('react-native-mmkv')
  const mmkv = new MMKV()
  storage = {
    getItem: (key) => mmkv.getString(key) ?? null,
    setItem: (key, value) => mmkv.set(key, value),
    removeItem: (key) => mmkv.delete(key),
  }
}

export { storage }
