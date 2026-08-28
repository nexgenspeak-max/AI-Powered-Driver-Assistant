// Thin wrapper over expo-haptics so call sites don't each repeat the
// platform guard + `.catch()`.
//
// Per-press feedback (`selection` / `light`) is DISABLED — the user asked to
// stop the buzz on every tap (tab switch, toggle, segment) to save battery.
// The meaningful one-off outcome buzzes (`success` / `warning` / `error`) are
// kept: they fire rarely (trip accepted/completed, booking confirmed) and
// carry real signal. Flip `PRESS_FEEDBACK` back to true to restore taps.
//
// Duplicated at `src/utils/haptics.ts` in customer-app — keep in sync.
import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

const supported = Platform.OS === 'ios' || Platform.OS === 'android'
const PRESS_FEEDBACK = false

export const haptics = {
  /** Light tick on tap — DISABLED (see PRESS_FEEDBACK). */
  selection() {
    if (supported && PRESS_FEEDBACK) Haptics.selectionAsync().catch(() => {})
  },
  /** Confirming tap on a primary button — DISABLED (see PRESS_FEEDBACK). */
  light() {
    if (supported && PRESS_FEEDBACK)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  },
  /** Positive outcome — trip accepted / completed, booking confirmed. */
  success() {
    if (supported)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      )
  },
  /** Something needs attention but isn't an error. */
  warning() {
    if (supported)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
        () => {},
      )
  },
  /** Action failed. */
  error() {
    if (supported)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(
        () => {},
      )
  },
}
