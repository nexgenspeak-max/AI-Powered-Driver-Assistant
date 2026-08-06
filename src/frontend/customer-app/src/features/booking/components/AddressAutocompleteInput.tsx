import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, TouchableOpacity } from 'react-native'
import { Text, View, YStack, useThemeName } from 'tamagui'
import { Ionicons } from '@expo/vector-icons'
import { GlassBookingInput } from './GlassBookingInput'
import { GlassSurface } from '../../../components/GlassSurface'
import { placesService, type PlaceSuggestion, type PlaceLocation } from '../../../services/api/places'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

interface Props {
  label: string
  value: string
  onChangeText: (text: string) => void
  /** Fires once a suggestion is tapped — `location` is the resolved lat/lng
   *  (via Goong Place Detail), `null` if that lookup failed. The field's own
   *  text always becomes the suggestion's human-readable description
   *  (`onChangeText`) regardless — `location` is extra precision for the
   *  caller to send alongside, not a replacement for the readable address. */
  onSelectSuggestion?: (suggestion: PlaceSuggestion, location: PlaceLocation | null) => void
  error?: string
  /** Biases suggestions toward this position (customer's current location). */
  near?: { lat: number; lng: number }
  /** Small pill rendered top-right of the field — e.g. "Use current location". */
  actionLabel?: string
  onPressAction?: () => void
  actionLoading?: boolean
}

// Search-as-you-type address field — GlassBookingInput plus a debounced
// Goong autocomplete dropdown (features/booking/components/GlassBookingInput.tsx
// for the field itself, services/api/places.ts for the backend proxy).
// Selecting a suggestion fills the field with its full description, same as
// tapping a result in Be/Grab's own pickup/dropoff search.
export function AddressAutocompleteInput({
  label,
  value,
  onChangeText,
  onSelectSuggestion,
  error,
  near,
  actionLabel,
  onPressAction,
  actionLoading,
}: Props) {
  const isLight = useThemeName() === 'light'
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Selecting a suggestion sets `value` to its own description — that
  // change would otherwise immediately re-trigger a search against itself.
  const skipNextSearchRef = useRef(false)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await placesService.autocomplete(value, near)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  useEffect(() => () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
  }, [])

  const handleSelect = async (suggestion: PlaceSuggestion) => {
    skipNextSearchRef.current = true
    setSuggestions([])
    setOpen(false)
    onChangeText(suggestion.description)

    if (!onSelectSuggestion) return
    try {
      const location = await placesService.detail(suggestion.place_id)
      onSelectSuggestion(suggestion, location)
    } catch {
      onSelectSuggestion(suggestion, null)
    }
  }

  const handleFocus = () => setOpen(true)
  // Delayed so a tap on a suggestion below (which blurs the field first)
  // still registers as a press before the dropdown unmounts.
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 150)
  }

  const showDropdown = open && (loading || suggestions.length > 0) && value.trim().length >= MIN_QUERY_LENGTH

  return (
    <YStack position="relative" zIndex={showDropdown ? 20 : 1}>
      <View position="relative">
        <GlassBookingInput
          label={label}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={error}
        />
        {actionLabel && (
          <TouchableOpacity
            onPress={onPressAction}
            disabled={actionLoading}
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 4,
              paddingHorizontal: 8,
            }}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Ionicons name="locate" size={14} color="#8B5CF6" />
            )}
            <Text fontSize="$1" fontWeight="600" color="#8B5CF6">
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View position="absolute" top={62} left={0} right={0} zIndex={20}>
          <GlassSurface cornerRadius={16} style={{ maxHeight: 220 }}>
            {loading && suggestions.length === 0 ? (
              <View padding="$3" alignItems="center">
                <ActivityIndicator size="small" color="#8B5CF6" />
              </View>
            ) : (
              suggestions.map((s, i) => (
                <TouchableOpacity key={s.place_id} onPress={() => handleSelect(s)}>
                  <View
                    flexDirection="row"
                    alignItems="center"
                    gap="$2"
                    paddingVertical="$3"
                    paddingHorizontal="$3"
                    borderTopWidth={i === 0 ? 0 : 1}
                    borderTopColor={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)'}
                  >
                    <Ionicons name="location-outline" size={16} color={isLight ? '#6B7280' : '#9CA3AF'} />
                    <Text fontSize="$3" color="$textPrimary" flex={1} numberOfLines={2}>
                      {s.description}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </GlassSurface>
        </View>
      )}
    </YStack>
  )
}
