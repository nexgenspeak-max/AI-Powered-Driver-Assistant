"""
English keyword-to-tool mapping prompt.
Included in system instructions to help the LLM choose the right tool.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>

## Tool: check_upcoming_trips
- Use when: driver asks about schedule, "what's my next trip", "do I have any trips", "show my trips"

---

## Tool: update_trip_status
- Use when: driver announces a movement update
  - status=ARRIVED_PICKUP: "I'm here", "arrived at pickup", "waiting for passenger"
  - status=PICKED_UP: "got the passenger", "passenger is in the car", "picked up"
  - status=COMPLETED: "trip done", "dropped off", "completed"

---

## Tool: call_customer
- Use when: driver wants to contact customer — "call the customer", "contact customer", "customer's number"
- Must ask for mode before calling:
  - mode=agent: AI calls → "let AI call", "summarize it for me", "you call them"
  - mode=bridge: direct → "connect me", "I'll talk directly", "put me through"

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

## Tool: get_my_trip (customer agent)
- Use when: "is my driver coming", "what's the status", "where is my driver", "how long until pickup"

## Tool: cancel_my_trip (customer agent)
- Use when: customer wants to cancel — ask for confirmation before calling

## Tool: get_driver_eta (customer agent)
- Use when: "how long", "is the driver close", "when will they arrive", "ETA"

</KeywordsMappingForToolUsage>
"""
