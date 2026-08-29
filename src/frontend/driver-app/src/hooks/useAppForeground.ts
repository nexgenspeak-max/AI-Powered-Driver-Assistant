import { useEffect, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'

/** True while the app is in the foreground (`active`). Pauses decorative animations when backgrounded to save CPU/battery. */
export function useAppForeground(): boolean {
  const [foreground, setForeground] = useState(() => AppState.currentState === 'active')

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      setForeground(next === 'active')
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [])

  return foreground
}
