# Spec — native iOS and Android driver apps (parity with the RN driver-app)

Reference behaviour: `parity-map.md` (extracted from `src/frontend/driver-app` on 2026-11-12). Every
screen, string, endpoint, store key and state listed there is in scope unless cut below.
Tags: `[all]` = iOS and Android.

## Acceptance criteria

- AC1 [all] Auth: landing, login, register (with field validation and the exact Vietnamese errors),
  token refresh collapsing concurrent 401s into one `/auth/refresh`, logout (offline PATCH then token wipe). Tokens live in Keychain (iOS) / Keystore-encrypted storage (Android).
- AC2 [all] Tab shell: Trang chủ, Chuyến, [Czen orb], Thu nhập, Cá nhân; hidden routes highlight
  their parent tab; tab bar hidden while the chat panel is open.
- AC3 [all] Home map (MapLibre + Goong style): driver marker, stop markers with trip colours,
  optimized route line, status pill, recenter, NextStopCard / GoOnlineCard, turn-by-turn HUD with
  off-route re-route (50 m × 3 ticks, ≤ 1 per 20 s) and arrival.
- AC4 [all] Chuyến: greeting, online toggle (optimistic), accent-insensitive search, segmented
  Chờ / Đang chạy / Xong with counts, TripCard, ActiveTripCard with stepper and next action (GPS fix
  first, 409 detail alert), cancel/reject confirms, OptimizedRouteCard, pull to refresh, every
  loading/empty/error state.
- AC5 [all] Add trip form posts `booked_via: driver` and returns to Chuyến.
- AC6 [all] Realtime: WebSocket while online, 3 s reconnect, `trip_offer` opens the offer sheet
  (30 s ring countdown, alert sound + haptic unless voice active, accept/reject), other events
  refresh the context.
- AC7 [all] Czen voice: token from `/voice/token`, LiveKit room connect with mic, filler audio,
  transcripts via `lk.transcription` / `lk.chat` text streams with segment merging and dedupe,
  `call_state` / `agent_state` data, `call_control` cancel, `call_transcript` in bridge mode,
  `search_contacts` RPC, chat panel with status chip, captions (vn/en), suggestions, composer with
  mic mute, text send and voice button, orb in the tab bar with idle/connecting/connected/error
  animation and audio-level response, last-message toast, auto-connect on pending nudge, background
  audio (iOS) / microphone foreground service (Android).
- AC8 [all] Earnings: today/7d/30d hero, weekly bar chart, grouped completed-trip history with search.
- AC9 [all] Profile + sub-screens: edit profile, vehicle, assistant settings (server settings with
  optimistic rollback, local voice language, hands-free ↔ wake word), bank info, documents, safety,
  support, terms, about, FAQ, dark-mode toggle (default dark), version footer.
- AC10 [all] Location: foreground live push with the distance-based cadence; background push while
  online (throttled 20 s / 150 m); immediate pushes on accept, trip_confirmed, new active trip,
  navigation start and proximity setting changes.
- AC11 [all] Wake word "hey ai" in hands-free mode opens the panel and connects.
- AC12 [all] Glass visual language: iOS uses system Liquid Glass (tab bar, toolbars, floating map
  controls, orb, composer, sheets) on iOS 26+; Android renders a matching frosted-glass layer (blur
  of content behind, tint, highlight border) on the same elements. Content cards stay solid
  surfaces. Light and dark themes with the parity-map palette.
- AC13 [all] Demo mode: a launch flag (`-demo` / `demo` build flavor) serves the screens from
  bundled fake data with no network, for screenshots and UI tests.

## Quality targets

- Cold start to first frame ≤ 1.5 s on simulator/emulator (Debug excluded; measured on Release).
- Zero compiler warnings; unit tests for API client (refresh collapse), transcript merging,
  navigation math, cadence policy, formatting, search folding.

## Non-goals / cuts (recorded)

- Web build, dev-only preview routes (map-preview, tabbar-preview, dev-say). dev-login is kept as
  a debug-only deep link.
- Store submission (local only).
