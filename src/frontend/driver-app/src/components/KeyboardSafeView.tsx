import { useEffect, useState } from 'react'
import { Keyboard, KeyboardAvoidingView, Platform, View, type ViewProps } from 'react-native'

type Props = ViewProps & { keyboardVerticalOffset?: number }

// iOS: `KeyboardAvoidingView behavior="padding"` is reliable here, so it's
// left untouched below.
//
// Android: `KeyboardAvoidingView` was tried with both 'height' and
// 'padding' — both drive their padding/height off an internal Animated
// value fed by native keyboard-frame measurement callbacks, and in this
// app's exact combination (RN new-architecture + edge-to-edge) that value
// reliably got stuck non-zero after the keyboard closed, leaving the whole
// screen visibly shifted up even once the keyboard was gone (reported with
// both behaviors, not just one — so it's the animated-value mechanism
// itself that's unreliable here, not the choice of behavior).
// This drives `paddingBottom` from plain React state via `Keyboard`'s own
// show/hide events instead — `keyboardDidHide` sets it back to a literal
// `0` every time, so there's no internal animation state left that can
// drift out of sync with where the keyboard actually is.
function AndroidKeyboardSafeView({ style, children, keyboardVerticalOffset: _unused, ...props }: Props) {
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', e => setKeyboardHeight(e.endCoordinates.height))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  return (
    <View style={[{ flex: 1 }, style, { paddingBottom: keyboardHeight }]} {...props}>
      {children}
    </View>
  )
}

// Shared drop-in replacement for `KeyboardAvoidingView` so every screen with
// a text input gets the same, actually-reliable keyboard behavior instead
// of each one separately guessing at `Platform.OS === 'ios' ? 'padding' : undefined`.
export function KeyboardSafeView({ style, keyboardVerticalOffset, ...props }: Props) {
  if (Platform.OS === 'android') {
    return <AndroidKeyboardSafeView style={style} {...props} />
  }
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[{ flex: 1 }, style]}
      {...props}
    />
  )
}
