import { useState } from 'react'
import { Pressable } from 'react-native'
import { View, XStack, YStack, useTheme, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '../../../components/AppText'
import { haptics } from '../../../utils/haptics'
import {
  VOICE_LOCALE_LIST,
  countryCodeToFlagEmoji,
  getVoiceLocale,
  type VoiceRoutingLang,
} from '../../../services/voiceLang'

const ROW_ICON = 'language-outline' as const

type Props = {
  value: VoiceRoutingLang
  onChange: (lang: VoiceRoutingLang) => void
}

function RowIcon({ name }: { name: keyof typeof Ionicons.glyphMap }) {
  const theme = useTheme()
  return (
    <View width={24} alignItems="center">
      <Ionicons name={name} size={20} color={theme.textSecondary.val} />
    </View>
  )
}

function FlagBadge({ countryCode }: { countryCode: string }) {
  return (
    <View width={24} alignItems="center" justifyContent="center">
      <AppText style={{ fontSize: 20, lineHeight: 24 }} accessibilityElementsHidden importantForAccessibility="no">
        {countryCodeToFlagEmoji(countryCode)}
      </AppText>
    </View>
  )
}

/**
 * Collapsible locale picker — matches ToggleRow icon + text layout.
 * Parent wraps in `<Surface flat>`. Add langs in services/voiceLang/locales.ts.
 */
export function VoiceLocalePicker({ value, onChange }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const [open, setOpen] = useState(false)
  const current = getVoiceLocale(value)

  const pick = (id: VoiceRoutingLang) => {
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
        accessibilityLabel="Ngôn ngữ trợ lý"
        accessibilityHint={open ? 'Thu gọn danh sách ngôn ngữ' : 'Mở danh sách ngôn ngữ'}
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
            <AppText variant="body">Ngôn ngữ trợ lý</AppText>
            <AppText variant="caption" color="$textSecondary" marginTop="$1">
              {countryCodeToFlagEmoji(current.flagCountry)} {current.nativeLabel} · {current.regionHint}
            </AppText>
          </YStack>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textMuted.val}
          />
        </XStack>
      </Pressable>

      {open ? (
        <>
          <View height={1} backgroundColor="$border" marginHorizontal="$4" />
          <YStack accessibilityRole="radiogroup" accessibilityLabel="Danh sách ngôn ngữ">
            {VOICE_LOCALE_LIST.map(({ id, locale }, index) => {
              const selected = value === id
              const isLast = index === VOICE_LOCALE_LIST.length - 1
              return (
                <View key={id}>
                  <Pressable
                    onPress={() => pick(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={`${locale.nativeLabel}, ${locale.regionHint}`}
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
                      <FlagBadge countryCode={locale.flagCountry} />
                      <YStack flex={1} gap="$0.5">
                        <AppText variant={selected ? 'label' : 'body'}>{locale.nativeLabel}</AppText>
                        <AppText variant="caption" color="$textSecondary">
                          {locale.regionHint}
                        </AppText>
                      </YStack>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.primary.val} />
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
