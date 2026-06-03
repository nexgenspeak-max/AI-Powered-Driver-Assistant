export const ROUTES = {
  TRIP_BOARD:   '/',
  CREATE_TRIP:  '/create',
  DRIVERS:      '/drivers',
  CALL_LOGS:    '/call-logs',
} as const

export const PAGE_TITLES: Record<string, string> = {
  [ROUTES.TRIP_BOARD]:  'Trip Board',
  [ROUTES.CREATE_TRIP]: 'Create New Trip',
  [ROUTES.DRIVERS]:     'Drivers',
  [ROUTES.CALL_LOGS]:   'Call Logs',
}
