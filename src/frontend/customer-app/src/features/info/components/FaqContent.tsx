import { useState } from 'react'
import { YStack, XStack, Text, useTheme } from 'tamagui'
import { TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { FAQ_ITEMS } from '../data/faqData'

export function FaqContent() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const theme = useTheme()

  return (
    <YStack gap={10}>
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <YStack
            key={i}
            backgroundColor="$surfaceElevated"
            borderWidth={1}
            borderColor="$border"
            borderRadius="$control"
            overflow="hidden"
          >
            <TouchableOpacity onPress={() => setOpenIndex(isOpen ? null : i)}>
              <XStack alignItems="center" justifyContent="space-between" paddingHorizontal="$4" paddingVertical="$3">
                <Text fontWeight="600" color="$textPrimary" flex={1} paddingRight="$2">
                  {item.question}
                </Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.textMuted.val} />
              </XStack>
            </TouchableOpacity>
            {isOpen && (
              <Text color="$textSecondary" lineHeight={24} paddingHorizontal="$4" paddingBottom={14}>
                {item.answer}
              </Text>
            )}
          </YStack>
        )
      })}
    </YStack>
  )
}
