import { useState } from 'react'
import { XStack, View, Text, useTheme } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Surface } from '../../../components/Surface'
import { FAQ_ITEMS } from '../data/faqData'

// One Surface with hairline dividers between rows — the same grouped-
// list pattern as Profile's "Cài đặt"/"Tài khoản" sections (MenuRow) and
// ProfileCard's InfoRow blocks, instead of the previous "stack of separate
// small Cards" look, which read as flat/disconnected next to those.
export function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const theme = useTheme()

  return (
    <Surface clip>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <View key={i}>
            <TouchableOpacity
              onPress={() => setOpenIndex(isOpen ? null : i)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4">
                <Text fontWeight="600" color="$textPrimary" flex={1} paddingRight="$2">
                  {item.question}
                </Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted.val} />
              </XStack>
            </TouchableOpacity>
            {isOpen && (
              <Text color="$textSecondary" fontSize={13} lineHeight={22} paddingHorizontal="$4" paddingBottom="$4">
                {item.answer}
              </Text>
            )}
            {i < FAQ_ITEMS.length - 1 && <View height={1} backgroundColor="$border" />}
          </View>
        )
      })}
    </Surface>
  )
}
