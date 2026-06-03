# Frontend Architecture — Admin Panel

**Stack:** React 19 + Vite + TypeScript + MUI v9 + React Query v5 + Zustand + React Router v7

---

## Directory Structure

```
src/
├── app/
│   └── App.tsx                     # Root: wires providers + router + layout
│
├── pages/                          # Thin route-level components — compose features only
│   ├── TripBoardPage.tsx
│   ├── CreateTripPage.tsx
│   └── DriversPage.tsx
│
├── features/                       # Feature modules — self-contained
│   ├── trips/
│   │   ├── components/
│   │   │   ├── TripTable.tsx       # Table + filter toolbar
│   │   │   ├── TripStatCards.tsx   # Stat card row
│   │   │   └── TripStatusChip.tsx  # MUI Chip for trip status
│   │   └── hooks/
│   │       ├── useTrips.ts         # useQuery — polls every 3s
│   │       ├── useCreateTrip.ts    # useMutation — create + notify
│   │       └── useDispatchTrip.ts  # useMutation — SIP dispatch
│   └── drivers/
│       ├── components/
│       │   ├── DriverTable.tsx
│       │   └── DriverStatCards.tsx
│       └── hooks/
│           └── useDrivers.ts       # useQuery — polls every 5s
│
├── components/                     # Shared, domain-agnostic UI components
│
├── services/
│   └── api/
│       ├── client.ts               # axios instance + response interceptor
│       ├── trips.ts                # tripsService — all trip API calls
│       ├── drivers.ts              # driversService — all driver API calls
│       └── index.ts                # re-export
│
├── hooks/                          # Shared custom hooks (useDebounce, etc.)
│
├── stores/
│   └── uiStore.ts                  # Zustand — UI state (e.g. tripStatusFilter)
│
├── layouts/
│   └── DashboardLayout.tsx         # Dark sidebar + white AppBar
│
├── providers/
│   ├── ThemeProvider.tsx           # MUI theme + CssBaseline
│   └── QueryProvider.tsx           # React Query QueryClient
│
├── routes/
│   └── index.tsx                   # AppRoutes — lazy-loaded with Suspense
│
├── utils/
│   └── format.ts                   # formatDate, formatDateTime, formatRoute, capitalizeStatus
│
├── types/
│   ├── trip.ts                     # Trip, TripStatus, CreateTripPayload
│   ├── driver.ts                   # Driver, DriverStatus
│   └── index.ts                    # re-export barrel
│
├── constants/
│   ├── routes.ts                   # ROUTES object, PAGE_TITLES
│   ├── status.ts                   # TRIP_STATUS_COLORS, TRIP_STATUS_LABELS, DISPATCHABLE_STATUSES
│   └── index.ts                    # re-export barrel
│
├── styles/
│   ├── theme.ts                    # MUI createTheme config
│   └── globals.css                 # Global CSS reset
│
├── assets/                         # Static files
└── tests/                          # Test files
```

---

## Key Conventions

### Pages are thin
Pages only import feature components and hooks — no business logic, no raw API calls:
```tsx
export default function TripBoardPage() {
  const { data: trips = [], isLoading } = useTrips(filter)
  return (
    <>
      <TripStatCards trips={trips} drivers={drivers} />
      <TripTable trips={trips} loading={isLoading} ... />
    </>
  )
}
```

### Custom hooks own data fetching
All API calls live inside hooks in `features/<name>/hooks/`. Pages never call `tripsService` directly.

```ts
// features/trips/hooks/useTrips.ts
export function useTrips(statusFilter?: string) {
  return useQuery({
    queryKey: ['trips', statusFilter],
    queryFn: () => tripsService.list(...),
    refetchInterval: 3000,   // live polling
  })
}
```

### UI state in Zustand stores
Filter state, modal open/close, sidebar collapse etc. go in `stores/uiStore.ts` — not in component state, so they survive navigation.

```ts
const filter    = useUiStore(s => s.tripStatusFilter)
const setFilter = useUiStore(s => s.setTripStatusFilter)
```

### Constants not magic strings
Never write `'/create'` or `'pending'` inline in components:
```ts
import { ROUTES, DISPATCHABLE_STATUSES, TRIP_STATUS_COLORS } from '../constants'
```

### New feature checklist
1. Add types to `types/<feature>.ts` + re-export from `types/index.ts`
2. Add API functions to `services/api/<feature>.ts` + re-export from `services/api/index.ts`
3. Add constants to `constants/status.ts` or new `constants/<feature>.ts`
4. Add hooks to `features/<feature>/hooks/`
5. Add components to `features/<feature>/components/`
6. Create thin page in `pages/`
7. Register route in `routes/index.tsx` + `constants/routes.ts`

---

## Dev Commands

```bash
cd src/frontend/admin-panel
npm run dev    # http://localhost:3002 (or next free port)
npm run build  # TypeScript check + Vite build
```

Env: `VITE_TRIP_SERVICE_URL=http://localhost:8002` in `.env.local`
