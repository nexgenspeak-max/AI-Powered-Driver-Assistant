import { useState } from 'react'
import { Modal, Platform, TouchableOpacity, TouchableWithoutFeedback } from 'react-native'
import { Text, View, XStack, YStack, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { GlassSurface } from '../../../components/GlassSurface'
import { SegmentedControl } from '../../../components/SegmentedControl'

export type ScheduleMode = 'now' | 'later'

const SCHEDULE_MODE_OPTIONS = [
  { value: 'now' as const, label: 'Đặt xe ngay' },
  { value: 'later' as const, label: 'Hẹn giờ đón' },
]

interface Props {
  mode: ScheduleMode
  onModeChange: (mode: ScheduleMode) => void
  pickupAt: Date | null
  onPickupAtChange: (date: Date) => void
  error?: string
}

function formatDateTime(date: Date) {
  const dateStr = date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}

// "Đặt xe ngay" / "Hẹn giờ đón" toggle + picker — feeds trips' existing
// `pickup_time` field (see backend/trip-service/src/services/tripService.ts,
// already sorted on and consumed by driverContextService for "upcoming
// trips"), so scheduling itself needed no backend change, only this UI.
export function PickupTimeField({ mode, onModeChange, pickupAt, onPickupAtChange, error }: Props) {
  const isLight = useThemeName() === 'light'
  const [iosPickerOpen, setIosPickerOpen] = useState(false)
  const [draft, setDraft] = useState<Date>(pickupAt ?? new Date())

  const openPicker = () => {
    const base = pickupAt ?? new Date()
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: base,
        mode: 'date',
        minimumDate: new Date(),
        onChange: (event, date) => {
          if (event.type !== 'set' || !date) return
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onChange: (timeEvent, time) => {
              if (timeEvent.type !== 'set' || !time) return
              onPickupAtChange(time)
            },
          })
        },
      })
    } else {
      setDraft(base)
      setIosPickerOpen(true)
    }
  }

  return (
    <YStack gap="$2">
      <SegmentedControl options={SCHEDULE_MODE_OPTIONS} value={mode} onChange={onModeChange} />

      {mode === 'later' && (
        <>
          <TouchableOpacity onPress={openPicker} activeOpacity={0.8}>
            <View
              flexDirection="row"
              alignItems="center"
              gap="$2"
              borderRadius={16}
              paddingVertical="$3"
              paddingHorizontal="$4"
              backgroundColor={isLight ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.12)'}
              borderWidth={1}
              borderColor={error ? '$danger' : 'rgba(139,92,246,0.3)'}
            >
              <Ionicons name="calendar-outline" size={18} color="#8B5CF6" />
              <Text fontSize="$3" fontWeight="600" color={pickupAt ? '$textPrimary' : '$textMuted'}>
                {pickupAt ? formatDateTime(pickupAt) : 'Chọn ngày & giờ đón'}
              </Text>
            </View>
          </TouchableOpacity>
          {error && (
            <Text fontSize="$1" color="$danger">
              {error}
            </Text>
          )}
        </>
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={iosPickerOpen} transparent animationType="fade" onRequestClose={() => setIosPickerOpen(false)}>
          <TouchableWithoutFeedback onPress={() => setIosPickerOpen(false)}>
            <View flex={1} backgroundColor="rgba(0,0,0,0.45)" justifyContent="flex-end">
              <TouchableWithoutFeedback>
                <View>
                  <GlassSurface cornerRadius={24} bottomCornerRadius={0} style={{ paddingBottom: 24 }}>
                    <XStack justifyContent="flex-end" padding="$3">
                      <TouchableOpacity
                        onPress={() => {
                          onPickupAtChange(draft)
                          setIosPickerOpen(false)
                        }}
                      >
                        <Text fontSize="$4" fontWeight="700" color="#8B5CF6">
                          Xong
                        </Text>
                      </TouchableOpacity>
                    </XStack>
                    <DateTimePicker
                      value={draft}
                      mode="datetime"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={(_, date) => date && setDraft(date)}
                      themeVariant={isLight ? 'light' : 'dark'}
                    />
                  </GlassSurface>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </YStack>
  )
}
