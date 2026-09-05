import { useRef, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  View as RNView,
  type LayoutRectangle,
} from 'react-native'
import { XStack, YStack, useTheme, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { AppText } from '../../../components/AppText'
import { authGlassTheme } from '../../../theme'
import { haptics } from '../../../utils/haptics'

/** Extend this list as new vehicle classes ship — UI is a floating dropdown. */
export const VEHICLE_TYPE_OPTIONS = [
  { value: 'motorbike', label: 'Xe máy' },
  { value: 'car_4', label: 'Ô tô 4 chỗ' },
  { value: 'car_7', label: 'Ô tô 7 chỗ' },
  { value: 'truck', label: 'Xe tải' },
] as const

export type VehicleTypeValue = (typeof VEHICLE_TYPE_OPTIONS)[number]['value']

interface Props {
  value: string
  onChange: (value: string) => void
  error?: string
}

/**
 * Vehicle-type select: trigger stays fixed height; menu is a Modal overlay
 * positioned under the field (absolute in window coords) so it does not
 * expand the form / get clipped by Card `overflow: hidden`.
 */
export function VehicleTypeSelect({ value, onChange, error }: Props) {
  const theme = useTheme()
  const isLight = useThemeName() === 'light'
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState<LayoutRectangle | null>(null)
  const triggerRef = useRef<RNView>(null)
  const current = VEHICLE_TYPE_OPTIONS.find(o => o.value === value)
  const field = authGlassTheme.field

  const openMenu = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height })
      setOpen(true)
    })
  }

  const closeMenu = () => setOpen(false)

  const pick = (next: string) => {
    if (next !== value) {
      haptics.selection()
      onChange(next)
    }
    closeMenu()
  }

  const menuBg = theme.surfaceElevated.val
  const ring = error ? theme.danger.val : isLight ? field.ring.light : field.ring.dark

  return (
    <YStack gap="$1" zIndex={open ? 20 : 0}>
      <AppText variant="label" color="$textSecondary">
        Loại xe
      </AppText>

      <RNView
        ref={triggerRef}
        collapsable={false}
        style={
          error
            ? undefined
            : {
                shadowColor: field.shadow.color.light,
                shadowOffset: { width: 0, height: isLight ? field.shadow.offsetY.light : field.shadow.offsetY.dark },
                shadowOpacity: isLight ? field.shadow.opacity.light : field.shadow.opacity.dark,
                shadowRadius: isLight ? field.shadow.radius.light : field.shadow.radius.dark,
                elevation: field.shadow.elevation,
              }
        }
      >
        <Pressable
          onPress={() => (open ? closeMenu() : openMenu())}
          accessibilityRole="button"
          accessibilityLabel="Loại xe"
          accessibilityHint={open ? 'Đóng danh sách loại xe' : 'Mở danh sách loại xe'}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => ({
            opacity: pressed ? 0.85 : 1,
            borderRadius: field.radius,
            overflow: 'hidden',
            backgroundColor: isLight ? field.background.light : field.background.dark,
            borderWidth: 1,
            borderColor: ring,
          })}
        >
          <XStack
            alignItems="center"
            justifyContent="space-between"
            paddingHorizontal="$4"
            paddingVertical="$3"
            minHeight={48}
            gap="$3"
          >
            <AppText variant="body" color={current ? '$textPrimary' : '$textMuted'} flex={1}>
              {current?.label ?? 'Chọn loại xe'}
            </AppText>
            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textMuted.val}
            />
          </XStack>
        </Pressable>
      </RNView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable
          style={styles.backdrop}
          onPress={closeMenu}
          accessibilityRole="button"
          accessibilityLabel="Đóng danh sách loại xe"
        />
        {anchor ? (
          <RNView
            style={[
              styles.menu,
              {
                top: anchor.y + anchor.height + 6,
                left: anchor.x,
                width: anchor.width,
                backgroundColor: menuBg,
                borderColor: isLight ? field.ring.light : theme.border.val,
                shadowColor: '#000',
                shadowOpacity: isLight ? 0.16 : 0.45,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 8 },
                elevation: 12,
              },
            ]}
            accessibilityRole="radiogroup"
            accessibilityLabel="Danh sách loại xe"
          >
            {VEHICLE_TYPE_OPTIONS.map((opt, index) => {
              const selected = value === opt.value
              const isLast = index === VEHICLE_TYPE_OPTIONS.length - 1
              return (
                <RNView key={opt.value}>
                  <Pressable
                    onPress={() => pick(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={opt.label}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                      backgroundColor: selected ? theme.pressedOverlay.val : 'transparent',
                      minHeight: 48,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    })}
                  >
                    <AppText variant={selected ? 'bodyStrong' : 'body'} color="$textPrimary">
                      {opt.label}
                    </AppText>
                    {selected ? (
                      <Ionicons name="checkmark-circle" size={22} color={theme.primary.val} />
                    ) : (
                      <RNView
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: theme.border.val,
                        }}
                      />
                    )}
                  </Pressable>
                  {!isLast ? (
                    <RNView style={{ height: 1, backgroundColor: theme.border.val, marginHorizontal: 16 }} />
                  ) : null}
                </RNView>
              )
            })}
          </RNView>
        ) : null}
      </Modal>

      {error ? (
        <AppText variant="caption" color="$danger">
          {error}
        </AppText>
      ) : null}
    </YStack>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  menu: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
})
