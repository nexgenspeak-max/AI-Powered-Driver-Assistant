import { useRef, useState } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { placesService, type PlaceSuggestion } from '../../../services/api/places'
import { fieldSx } from '../../../styles/forms'

const DEBOUNCE_MS = 300
const MIN_QUERY_LENGTH = 2

interface Props {
  label: string
  value: string
  onChange: (address: string, lat?: number, lng?: number) => void
  error?: string
  near?: { lat: number; lng: number }
}

export default function AddressAutocompleteInput({ label, value, onChange, error, near }: Props) {
  const [inputValue, setInputValue] = useState(value)
  const [options, setOptions] = useState<PlaceSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const skipNextSearchRef = useRef(false)

  const displayOptions = inputValue.trim().length >= MIN_QUERY_LENGTH ? options : []

  const scheduleSearch = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    if (query.trim().length < MIN_QUERY_LENGTH) return

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const results = await placesService.autocomplete(query, near)
        setOptions(results)
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
  }

  const handleSelect = async (suggestion: PlaceSuggestion | null) => {
    if (!suggestion) {
      onChange('')
      return
    }

    skipNextSearchRef.current = true
    setOptions([])
    setInputValue(suggestion.description)
    onChange(suggestion.description)

    try {
      const location = await placesService.detail(suggestion.place_id)
      onChange(location.address, location.lat, location.lng)
    } catch {
      onChange(suggestion.description)
    }
  }

  return (
    <Autocomplete
      freeSolo
      options={displayOptions}
      filterOptions={x => x}
      inputValue={inputValue}
      onInputChange={(_, newValue, reason) => {
        setInputValue(newValue)
        if (reason === 'input') {
          onChange(newValue)
          scheduleSearch(newValue)
        }
      }}
      onChange={(_, option) => {
        if (typeof option === 'string') {
          onChange(option)
          return
        }
        void handleSelect(option)
      }}
      getOptionLabel={option => (typeof option === 'string' ? option : option.description)}
      isOptionEqualToValue={(a, b) =>
        typeof a === 'string' || typeof b === 'string'
          ? a === b
          : a.place_id === b.place_id
      }
      loading={loading}
      noOptionsText={inputValue.trim().length < MIN_QUERY_LENGTH ? 'Nhập ít nhất 2 ký tự' : 'Không tìm thấy địa chỉ'}
      renderInput={params => (
        <TextField
          {...params}
          label={label}
          sx={fieldSx}
          error={!!error}
          helperText={error}
        />
      )}
    />
  )
}
