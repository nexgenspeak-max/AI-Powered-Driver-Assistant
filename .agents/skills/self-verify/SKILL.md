---
name: self-verify
description: >-
  Closed local verify→fix loop for this repo (maps, voice, driver-app). Use
  whenever testing map/location/UI, the user cannot open a phone, or they
  want self-fix / self-update / self-improve without waiting on a device.
---

# Self-verify (no physical device)

Never block on "open the iPhone." Agents test locally, then fix what failed, then re-run.

## Loop

1. **Probe APIs / wiring** — run the project's headless check (no login, no device):
   - Maps: `cd src/frontend/driver-app && npm run verify:map`
   - Voice STT: existing `voice-agent` tests / a live Google STT call if credentials exist
2. **Visual (maps):** Expo web, not a phone:
   - `cd src/frontend/driver-app && npm run web`
   - Open `/map-preview` (DEV, no login). Tiles + default Hanoi camera must render.
3. **Fix the failure**, then repeat from step 1. Do not report done with a known-failing check.
4. **Native is optional extra**, not the gate:
   - Simulator: `npx expo run:ios` (no `--device`)
   - Physical iPhone: `npm run ios:device` (runs `ensure-maplibre-ios.sh`). Bare `expo run:ios --device` often fails on missing `MapLibre.xcframework`.

## Maps facts

- Tiles key: `EXPO_PUBLIC_GOONG_MAPS_KEY` (Goong Maptiles). REST routing: trip-service `MAPS_PROVIDER=goong` + `MAPS_API_KEY`.
- `DriverMap.tsx` = native MapLibre. `DriverMap.web.tsx` = `maplibre-gl` for this loop.
- `customer-app` needs its own `EXPO_PUBLIC_GOONG_MAPS_KEY` or the customer map is blank.

## Do not

- Ask the user to plug in a phone to "verify the map."
- Treat a placeholder `DriverMap.web.tsx` as verified UI.
- Print API keys from `.env` into logs or chat.
