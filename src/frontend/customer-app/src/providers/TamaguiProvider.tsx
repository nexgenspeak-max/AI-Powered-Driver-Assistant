import { TamaguiProvider as BaseTamaguiProvider } from 'tamagui'
import tamaguiConfig from '../styles/tamagui.config'

export function TamaguiProvider({ children }: { children: React.ReactNode }) {
  return (
    <BaseTamaguiProvider config={tamaguiConfig} defaultTheme="light">
      {children}
    </BaseTamaguiProvider>
  )
}
