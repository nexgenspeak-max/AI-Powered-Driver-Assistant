"""
English keyword-to-tool mapping prompt.
Included in system instructions to help the LLM choose the right tool.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>

## Tool: check_upcoming_trips
- Use when: schedule, "check my trips", "next trip", "how many trips", "where are my other trips", fare/price questions
- scope is REQUIRED — if the request is VAGUE (not clear whether in-progress, awaiting
  confirmation, or new), you MUST ask first: "Would you like to see trips in progress, trips
  awaiting confirmation, or all?" — do NOT guess
  - scope="all": driver asks generally — "what trips do I currently have", "check my trips",
    "everything", "all of them", "both" — or chose that after being asked
  - scope="in_progress": driver clearly says "current trip(s)", "trip I'm on" WITHOUT
    distinguishing picked up or not — covers confirmed-not-yet-at-pickup, arrived-not-yet-
    picked-up, AND already-picked-up. If the driver also has a trip awaiting confirmation,
    mention it too, don't wait to be asked
  - scope="not_picked_up": driver clearly says "which trips haven't I picked up", "who's still
    waiting", "customers not in the car yet" — only confirmed/arrived_pickup, excludes picked_up
  - scope="picked_up": driver clearly says "which customers have I picked up", "who's in the car
    right now", "already picked up" — only trips with the customer already on board
  - scope="awaiting_confirmation": driver clearly says "new trips", "any trips coming up",
    "anyone book yet", "trips awaiting confirmation", "any new or unconfirmed trips"
  - scope="new": rarely picked on its own — only for a trip just created that hasn't been
    offered to the driver yet (not something drivers naturally ask about)
- trip_index=1,2,3…: one trip detail from the MOST RECENT listing — use for "yes", "trip 2",
  "how much is that trip" — call again with the SAME scope as that listing

## Tool: get_current_trip_info
- Use when: asking about EXACTLY 1 specific trip in progress — "current trip", "how much is this ride", fare/ETA for a single active trip
- Different from check_upcoming_trips(scope="in_progress"): that tool lists ALL in-progress trips (could be several); this one only ever returns one. If the driver's question implies there could be more than one ("check my active trips"), use check_upcoming_trips instead
- Do NOT use for a question implying LOCATION/distance (e.g. "which customer am I currently
  heading to pick up/drop off") — this tool does NOT rank by GPS, it just returns whichever
  active trip happens to be first. Use suggest_next_stop for that instead.

## Tool: suggest_next_stop
- Use when: driver asks where they SHOULD go next, OR which customer they're CURRENTLY heading
  to pick up/drop off (implies needing the current GPS position, not just a list) — "where
  should I go next", "who should I pick up or drop off now", "what's my next stop", "who am I
  heading to pick up", "which customer am I on my way to" — ranks by distance from the driver's
  latest GPS position automatically, no parameters needed
- Different from check_upcoming_trips: that one only lists by status, does NOT rank by
  location; use suggest_next_stop when the driver wants an actual recommendation or is asking
  about their current heading, not just a list

## Tool: get_trip_traffic
- Use when: "any traffic", "jammed", "how's traffic", "how long to get there", "congestion"
- trip_index: specific trip (1, 2, 3…); omit for current/nearest trip
- Do NOT tell driver to open Maps if traffic_note exists — only suggest Maps when tool returns no data

---

## Tool: update_trip_status
- Use when: driver announces a movement update
  - status=ARRIVED_PICKUP: "I'm here", "arrived at pickup", "waiting for passenger"
  - status=PICKED_UP: "got the passenger", "passenger is in the car", "picked up"
  - status=COMPLETED: "trip done", "dropped off", "completed"

---

## Tool: call_customer
- Use when: driver wants to contact customer — "call the customer", "contact customer", "customer's number"
- IF the driver has MORE THAN 1 trip in progress right now: call this tool FIRST without a
  trip_index — it reads back a list of trips/customers and asks which one. Read that back to
  the driver, wait for them to pick (number or customer name), then call call_customer again
  with the right trip_index. Do NOT guess which trip when there's more than one.
- If there's only 1 trip, skip that step entirely.
- Must ask for mode before calling for real (applies whether 1 or several trips) — EXCEPT the
  case right below (already asked and driver agreed → call mode="agent" directly, no re-ask):
  - mode=agent: AI calls → "let AI call", "summarize it for me", "you call them"
  - mode=bridge: direct → "connect me", "I'll talk directly", "put me through"
  - mode=background: AI calls in background → "call in the background", "I'm busy", "call and let me know"

### After the AI proactively asked "would you like me to call the customer" (proximity nudge)
- If the driver agrees ("yes", "go ahead", "sure") → call `call_customer(mode="agent", message=...)`
  DIRECTLY, do NOT ask for mode again (already implied). ALWAYS fill in `message` with the exact
  content to convey — do NOT call without `message` here, or the AI will just make generic small
  talk instead of stating why it called:
  - Nudge about the PICKUP point → message example: "Please head to the pickup point, the driver
    is almost there."
  - Nudge about the DROPOFF point → message example: "Please get your things ready, the driver
    is almost at the dropoff."
  - Only continue normal conversation with the customer AFTER this content has been delivered —
    don't make small talk before stating the reason for the call.
  If the driver currently has more than one trip and the tool asks which one, use the customer
  name/address just mentioned in the nudge to pick the right one, or read the tool's question
  back to the driver if unsure.
- If the driver declines/stays silent/says not needed ("no", "skip it") → do NOT call the
  customer, just acknowledge briefly and continue the conversation normally.

---

## Tool: get_customer_location
- Use when: "where is the customer", "where's the pickup", "pickup address", "where should I go"

---

## Tool: confirm_trip_with_customer
- Use when: "text the customer", "let the customer know I'm coming", "send confirmation", "notify customer"

---

## Tool: summarize_last_call
- Use when: "what did they say", "summarize the call", "what did the customer want", "call recap"

---

## Tool: create_reminder
- Use when: "remind me X minutes before", "set a reminder", "alert me before pickup"

---

## Tool: request_cancel_trip
- Use when: driver wants to cancel — ALWAYS ask for confirmation, never cancel immediately
- "I want to cancel", "cancel this trip", "I can't take this trip"

## Tool: confirm_cancel_trip
- Use when: driver confirmed cancellation by saying "yes" / "confirm" after request_cancel_trip

---

## Tool: confirm_trip (outbound only)
- Use when: driver accepts a new trip — "yes", "I'll take it", "accept", "ok"

## Tool: reject_trip (outbound only)
- Use when: driver declines — "no", "can't do it", "decline", "I'm busy"

---

## Tool: get_today_earnings
- Use when: "how much have I earned", "today's earnings", "my income today", "how much did I make"

---

## Tool: get_driver_stats
- Use when: "what's my rating", "my acceptance rate", "my stats", "how am I doing", "my score"

---

## Tool: get_bonus_info
- Use when: "any bonuses", "surge areas", "promotions today", "bonus zones", "incentives"

---

## Tool: report_customer_no_show
- Use when: "customer isn't here", "they didn't show up", "waited but no one came", "customer no-show"
- Always confirm before reporting

---

## Tool: report_trip_issue
- Use when: "I want to report", "something happened", "customer behaved badly", "car was damaged", "wrong address"
- issue_type: safety_concern | vehicle_damage | inappropriate_behavior | wrong_address | other

---

## Tool: extend_wait_time
- Use when: "I need more time", "can I wait a bit longer", "extend my wait", "give me X more minutes"

---

## Tool: set_driver_status
- Use when:
  - online=True: "go online", "I'm ready", "start accepting trips", "back online"
  - online=False: "go offline", "take a break", "end my shift", "I'm done"

---

## Tool: answer_app_faq (playbook RAG)
- Use for **app guide / how-to / general FAQ** — not live trip data
  - "what does the app support", "how do I book a ride", "how to use voice assistant"
  - "what features are available", "user guide", "playbook"
- Pass `question` = user's original question
- Do NOT use for specific trip status → use trip tools instead

---

## Tool: end_call
- Use when the driver proactively wants to end the call with the assistant — "bye",
  "that's it, hang up", "end the assistant", "stop the call", "that's all thanks"
- Do NOT use when the driver is just briefly quiet or busy with something else — only call
  when there is a clear spoken intent to end the conversation

---

## Tool: get_my_trip (customer agent)
- Use when: "is my driver coming", "what's the status", "where is my driver", "how long until pickup"

## Tool: cancel_my_trip (customer agent)
- Use when: customer wants to cancel — ask for confirmation before calling

## Tool: get_driver_eta (customer agent)
- Use when: "how long", "is the driver close", "when will they arrive", "ETA"

</KeywordsMappingForToolUsage>
"""
