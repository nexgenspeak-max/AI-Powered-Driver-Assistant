import { useEffect, useRef } from 'react'
import { useDriverContext } from '../../dashboard/hooks/useDriverContext'
import { useAssistantChatStore } from '../stores/assistantChatStore'
import { useVoiceSessionStore } from '../stores/voiceSessionStore'
import { useCurrentUser } from '../../auth/hooks/useCurrentUser'

// Auto-opens a voice session ONLY when the assistant has a proactive nudge
// waiting (proximity-to-pickup/dropoff alert, next-stop suggestion) that
// couldn't be delivered live because the driver had no session open at the
// time — see trip-service's driverReachService.ts (saves it) and voice.ts
// (delivers it into the room this creates, via room metadata). Deliberately
// does NOT connect just because the app is open/foregrounded —
// `has_pending_nudge` is the sole trigger, per explicit product decision
// (no unconditional auto-connect, no phone call to the driver either).
export function useAutoConnectOnNudge(): void {
  const { data: driver } = useCurrentUser()
  const { data: context } = useDriverContext()
  const status = useVoiceSessionStore(s => s.status)
  const connect = useVoiceSessionStore(s => s.connect)

  // Guards against re-firing on every context refetch while a connect
  // triggered by this hook is still in flight/connected — trip-service only
  // flips has_pending_nudge back to false once the room is actually created
  // (voice.ts), which can lag a refetch behind the connect() call itself.
  const triggeredRef = useRef(false)

  useEffect(() => {
    if (!context?.has_pending_nudge || !driver?.phone) {
      triggeredRef.current = false
      return
    }
    if (triggeredRef.current) return
    if (status !== 'idle') return

    triggeredRef.current = true
    // Show chat + status line immediately — same feedback as a manual orb tap.
    useAssistantChatStore.getState().openPanel()
    connect(driver.phone)
  }, [context?.has_pending_nudge, driver?.phone, status, connect])
}
