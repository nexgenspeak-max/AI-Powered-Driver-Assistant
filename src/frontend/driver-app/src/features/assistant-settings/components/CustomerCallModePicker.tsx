import { useState } from 'react'
import { Pressable } from 'react-native'
import { View, XStack, YStack, useTheme, useThemeName } from 'tamagui'
import { Icon, type IconName } from '../../../components/icons'
import { AppText } from '../../../components/AppText'
import { haptics } from '../../../utils/haptics'
import type { CustomerCallMode } from '../../../services/api/settings'

const ROW_ICON = 'phone' as const

const OPTIONS: {
  id: CustomerCallMode
  label: string
  description: string
}[] = [
  {
    id: 'agent',
    label: 'AI gọi hộ',
    description: 'AI nói với khách, bạn nghe live và có thể chen vào khi cần',
  },
  {
    id: 'bridge',
    label: 'Bạn nói trực tiếp',
    description: 'AI chỉ quay số, bạn nói trực tiếp với khách',
  },
]

type Props = {
  value: CustomerCallMode
  onChange: (mode: CustomerCallMode) => void
}

function RowIcon({ name }: { name: IconName }) {
  const theme = useTheme()
  return (
    <View width={24} alignItems="center">
      <Icon name={name} size={20} color={theme.textSecondary.val} />
    </View>
  )
}

/** Collapsible picker for default outbound customer call mode. */
export function CustomerCallModePicker({ value, onChange }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find(o => o.id === value) ?? OPTIONS[0]

  const pick = (id: CustomerCallMode) => {
    if (id !== value) {
      haptics.selection()
      onChange(id)
    }
    setOpen(false)
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(prev => !prev)}
        accessibilityRole="button"
        accessibilityLabel="Cách gọi khách mặc định"
        accessibilityHint={open ? 'Thu gọn tùy chọn gọi khách' : 'Mở tùy chọn gọi khách'}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <XStack
          alignItems="center"
          justifyContent="space-between"
          gap="$3"
          paddingHorizontal="$4"
          paddingVertical="$4"
          minHeight={56}
        >
          <RowIcon name={ROW_ICON} />
          <YStack flex={1} paddingRight="$2">
            <AppText variant="body">Gọi khách mặc định</AppText>
            <AppText variant="caption" color="$textSecondary" marginTop="$1">
              {current.label} · {current.description}
            </AppText>
          </YStack>
          <Icon
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textMuted.val}
          />
        </XStack>
      </Pressable>

      {open ? (
        <>
          <View height={1} backgroundColor="$border" marginHorizontal="$4" />
          <YStack accessibilityRole="radiogroup" accessibilityLabel="Cách gọi khách mặc định">
            {OPTIONS.map((option, index) => {
              const selected = value === option.id
              const isLast = index === OPTIONS.length - 1
              return (
                <View key={option.id}>
                  <Pressable
                    onPress={() => pick(option.id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={`${option.label}, ${option.description}`}
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                  >
                    <XStack
                      alignItems="center"
                      justifyContent="space-between"
                      gap="$3"
                      paddingHorizontal="$4"
                      paddingVertical="$3"
                      minHeight={48}
                      backgroundColor={
                        selected ? (isLight ? '$backgroundHover' : '$backgroundFocus') : '$background'
                      }
                    >
                      <View width={24} />
                      <YStack flex={1} gap="$0.5">
                        <AppText variant={selected ? 'label' : 'body'}>{option.label}</AppText>
                        <AppText variant="caption" color="$textSecondary">
                          {option.description}
                        </AppText>
                      </YStack>
                      {selected ? (
                        <Icon name="check-circle" size={22} color={theme.primary.val} />
                      ) : (
                        <View width={22} height={22} borderRadius={11} borderWidth={1.5} borderColor="$border" />
                      )}
                    </XStack>
                  </Pressable>
                  {!isLast ? <View height={1} backgroundColor="$border" marginHorizontal="$4" /> : null}
                </View>
              )
            })}
          </YStack>
        </>
      ) : null}
    </>
  )
}
