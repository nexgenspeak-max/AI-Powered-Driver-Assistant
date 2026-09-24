const AUTOCOMPLETE_URL = 'https://rsapi.goong.io/Place/AutoComplete';
const DETAIL_URL = 'https://rsapi.goong.io/Place/Detail';
const GEOCODE_URL = 'https://rsapi.goong.io/Geocode';

export interface PlaceSuggestion {
  place_id: string;
  description: string;
}

export interface PlaceLocation {
  address: string;
  lat: number;
  lng: number;
}

// Free-text address search-as-you-type, biased toward `location` (customer's
// current position) when given — same Goong key as mapsService's getRoute
// (rsapi.goong.io), just a different endpoint.
export async function autocomplete(input: string, apiKey: string, location?: string): Promise<PlaceSuggestion[]> {
  if (!apiKey || !input.trim()) return [];

  const params = new URLSearchParams({ input, api_key: apiKey, ...(location ? { location } : {}) });
  const resp = await fetch(`${AUTOCOMPLETE_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
  const data = await resp.json() as Record<string, unknown>;

  if (!Array.isArray(data.predictions)) return [];
  return (data.predictions as any[]).map(p => ({
    place_id: p.place_id as string,
    description: p.description as string,
  }));
}

// Resolves a place_id (from autocomplete) to its coordinates + formatted
// address, for prefilling the field once the user taps a suggestion.
export async function placeDetail(placeId: string, apiKey: string): Promise<PlaceLocation | null> {
  if (!apiKey || !placeId) return null;

  const params = new URLSearchParams({ place_id: placeId, api_key: apiKey });
  const resp = await fetch(`${DETAIL_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
  const data = await resp.json() as Record<string, unknown>;

  const result = data.result as Record<string, unknown> | undefined;
  const location = (result?.geometry as any)?.location;
  if (!result || !location) return null;

  return {
    address: (result.formatted_address as string) ?? '',
    lat: location.lat,
    lng: location.lng,
  };
}

// Reverse geocode — used to prefill the pickup field from the customer's
// current GPS position when the booking screen first opens.
export async function reverseGeocode(lat: number, lng: number, apiKey: string): Promise<string | null> {
  if (!apiKey) return null;

  const params = new URLSearchParams({ latlng: `${lat},${lng}`, api_key: apiKey });
  const resp = await fetch(`${GEOCODE_URL}?${params}`, { signal: AbortSignal.timeout(5000) });
  const data = await resp.json() as Record<string, unknown>;

  if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) return null;
  return (data.results as any[])[0]?.formatted_address ?? null;
}
