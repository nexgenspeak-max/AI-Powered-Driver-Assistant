import { createTamagui } from 'tamagui'
import { config as defaultConfig } from '@tamagui/config/v3'

export const tamaguiConfig = createTamagui(defaultConfig)

export default tamaguiConfig

export type AppConfig = typeof tamaguiConfig

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}
