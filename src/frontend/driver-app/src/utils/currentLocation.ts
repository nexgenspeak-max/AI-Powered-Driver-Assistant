import * as Location from 'expo-location'

// getCurrentPositionAsync always blocks on a brand-new GPS fix (can take
// several seconds indoors/cold GPS). Try the OS's cached last-known fix
// first — maxAge/requiredAccuracy keep it safe: anything stale or too
// imprecise is rejected and we fall back to the slower path unchanged, so
// callers never see a worse location than a plain getCurrentPositionAsync
// call, only a faster one when a recent fix already exists.
export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    throw new Error('Cần quyền vị trí để xác nhận trạng thái này')
  }
  const cached = await Location.getLastKnownPositionAsync({
    maxAge: 20000,
    requiredAccuracy: 100,
  })
  const position = cached ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }))
  return { lat: position.coords.latitude, lng: position.coords.longitude }
}
