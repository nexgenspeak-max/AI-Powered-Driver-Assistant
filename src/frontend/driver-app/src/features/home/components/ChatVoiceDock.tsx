import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AssistantTabButton, ORB_SIZE, BUTTON_LABEL_OVERHANG, BUTTON_RISE } from '../../../components/AssistantTabButton'
import { useAssistantChatStore } from '../stores/assistantChatStore'

/** Padding under the floating orb (above home indicator). */
const DOCK_BOTTOM_PAD = 8
/** Gap between composer and top of orb. */
const COMPOSER_ORB_GAP = 5

/**
 * Bottom margin for the chat composer (add to `insets.bottom`).
 * Only clears the floating orb — not the full tab bar footprint.
 */
export const CHAT_ORB_CLEARANCE =
  DOCK_BOTTOM_PAD + ORB_SIZE + BUTTON_LABEL_OVERHANG + COMPOSER_ORB_GAP

/**
 * Chat-open chrome: only the Trợ lý orb (no tab bar). Same press semantics
 * as the tab-bar orb — hang up when connected, reconnect when idle.
 */
export function ChatVoiceDock() {
  const panelOpen = useAssistantChatStore((s) => s.panelOpen)
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  if (!panelOpen) return null

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.dock,
        {
          bottom: insets.bottom + DOCK_BOTTOM_PAD,
          // Orb uses top: -BUTTON_RISE from an inner baseline — keep height
          // to the visible stack only (no extra empty band under the orb).
          height: ORB_SIZE + BUTTON_LABEL_OVERHANG,
          zIndex: 110,
          elevation: 110,
        },
      ]}
    >
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, top: BUTTON_RISE, height: 0 }}
      >
        <AssistantTabButton centerX={width / 2} barWidth={width} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
})
