export async function getCurrentCoords(): Promise<{ lat: number; lng: number }> {
  if (!navigator.geolocation) {
    throw new Error('Trình duyệt không hỗ trợ định vị GPS.')
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(new Error(err.message || 'Không lấy được vị trí GPS.')),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    )
  })
}
