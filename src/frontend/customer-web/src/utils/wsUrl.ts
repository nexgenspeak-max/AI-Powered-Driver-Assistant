export function deriveTripWsUrl(): string {
  const explicit = import.meta.env.VITE_TRIP_SERVICE_WS_URL as string | undefined
  if (explicit) return explicit
  const restBase = import.meta.env.VITE_TRIP_SERVICE_URL ?? 'http://localhost:8002/api/v1'
  return restBase.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '') + '/ws'
}
