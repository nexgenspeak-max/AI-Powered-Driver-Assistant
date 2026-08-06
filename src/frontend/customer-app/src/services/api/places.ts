import { apiClient } from './client'

export interface PlaceSuggestion {
  place_id: string
  description: string
}

export interface PlaceLocation {
  address: string
  lat: number
  lng: number
}

export const placesService = {
  // `near` biases results toward the customer's current position (Goong
  // ranks nearby matches higher) — same address typed elsewhere in Vietnam
  // still resolves, just without that boost.
  autocomplete: (input: string, near?: { lat: number; lng: number }) =>
    apiClient
      .get<{ predictions: PlaceSuggestion[] }>('/places/autocomplete', {
        params: { input, ...(near ? { lat: near.lat, lng: near.lng } : {}) },
      })
      .then(r => r.data.predictions),

  detail: (placeId: string) =>
    apiClient.get<PlaceLocation>('/places/detail', { params: { place_id: placeId } }).then(r => r.data),

  reverse: (lat: number, lng: number) =>
    apiClient.get<{ address: string }>('/places/reverse', { params: { lat, lng } }).then(r => r.data.address),
}
