import { useState } from 'react'
import { XStack, View, useTheme } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Surface } from '../../../components/Surface'
import { AppText } from '../../../components/AppText'
import { FAQ_ITEMS } from '../data/faqData'

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
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={item.question}
              accessibilityState={{ expanded: isOpen }}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$4" minHeight={44}>
                <AppText variant="title" flex={1} paddingRight="$2">
                  {item.question}
                </AppText>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted.val} />
              </XStack>
            </TouchableOpacity>
            {isOpen && (
              <AppText variant="body" color="$textSecondary" paddingHorizontal="$4" paddingBottom="$4">
                {item.answer}
              </AppText>
            )}
            {i < FAQ_ITEMS.length - 1 && <View height={1} backgroundColor="$border" />}
          </View>
        )
      })}
    </Surface>
  )
}
