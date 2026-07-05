# Driver FAQ — English

Mirror of [faq-driver-vi.md](./faq-driver-vi.md) for the English voicebot (`app/voicebot/en/`).

---

## 1. Trip schedule

| ID | Sample utterance | Tool |
|----|------------------|------|
| T01 | "What's my next trip?" | `check_upcoming_trips` |
| T02 | "How many trips do I have today?" | `check_upcoming_trips` |
| T03 | "Do I have any upcoming trips?" | `check_upcoming_trips` |
| T04 | "Show my schedule." | `check_upcoming_trips` |

---

## 2. Trip status updates

| ID | Sample utterance | Tool | Status |
|----|------------------|------|--------|
| T10 | "I've arrived at the pickup." | `update_trip_status` → `ARRIVED_PICKUP` | |
| T11 | "Waiting for the passenger." | `update_trip_status` → `ARRIVED_PICKUP` | |
| T12 | "Passenger is in the car." | `update_trip_status` → `PICKED_UP` | |
| T13 | "Picked up the customer." | `update_trip_status` → `PICKED_UP` | |
| T14 | "Trip completed." | `update_trip_status` → `COMPLETED` | |
| T15 | "Dropped off the passenger." | `update_trip_status` → `COMPLETED` | |

---

## 3. Pickup location

| ID | Sample utterance | Tool |
|----|------------------|------|
| T20 | "Where is the customer?" | `get_customer_location` |
| T21 | "What's the pickup address?" | `get_customer_location` |
| T22 | "Where should I go?" | `get_customer_location` |

---

## 4. Customer contact

| ID | Sample utterance | Tool |
|----|------------------|------|
| T30 | "Call the customer for me." | `call_customer` (ask mode first) |
| T31 | "Connect me to the customer." | `call_customer` → `bridge` |
| T32 | "Have AI call and summarize." | `call_customer` → `agent` |
| T33 | "What did they say on the call?" | `summarize_last_call` |
| T34 | "Summarize the last call." | `summarize_last_call` |
| T35 | "Text the customer I'm on my way." | `confirm_trip_with_customer` |
| T36 | "Confirm with the customer." | `confirm_trip_with_customer` |

---

## 5. Accept / reject / cancel

| ID | Sample utterance | Tool |
|----|------------------|------|
| T40–T43 | Accept/reject new trip | `confirm_trip` / `reject_trip` (outbound) |
| T44–T46 | Cancel active trip | `request_cancel_trip` → `confirm_cancel_trip` |

---

## 6. Wait time & reminders

| ID | Sample utterance | Tool |
|----|------------------|------|
| T50–T52 | Extend wait at pickup | `extend_wait_time` |
| T53–T54 | Set pickup reminder | `create_reminder` |

---

## 7. Incidents

| ID | Sample utterance | Tool |
|----|------------------|------|
| T60–T62 | Customer no-show | `report_customer_no_show` |
| T63–T67 | Trip issues | `report_trip_issue` |

---

## 8. Earnings & stats

| ID | Sample utterance | Tool |
|----|------------------|------|
| T70–T72 | Today's earnings | `get_today_earnings` |
| T73–T75 | Rating, acceptance rate | `get_driver_stats` |
| T76–T78 | Bonuses, surge zones | `get_bonus_info` |

---

## 9. Availability

| ID | Sample utterance | Tool |
|----|------------------|------|
| T80–T81 | Go online | `set_driver_status` |
| T82–T84 | Go offline | `set_driver_status` |

---

## 10. General FAQ (LLM only)

| ID | Question | Suggested answer |
|----|----------|------------------|
| G01 | "What can you help with?" | Short capability list |
| G02 | "How do I call the customer?" | Explain agent vs bridge modes |
| G03 | "How do I cancel a trip?" | Two-step confirmation flow |
| G04 | "Customer didn't show up?" | Extend wait → call → report no-show |
