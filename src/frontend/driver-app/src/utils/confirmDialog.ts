import { Alert, Platform } from 'react-native'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
}

// react-native-web's Alert.alert is a hard no-op (see
// node_modules/react-native-web/src/exports/Alert — `static alert() {}`),
// so a destructive confirm built on it silently does nothing on web: no
// dialog, and onConfirm never fires. window.confirm is the browser's direct
// equivalent and actually blocks for a user decision there.
export function confirmDestructive({ title, message, confirmLabel, cancelLabel, onConfirm }: ConfirmOptions) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}
