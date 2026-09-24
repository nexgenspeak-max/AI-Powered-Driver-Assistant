"""
English tool schemas.
Each entry is a raw JSON-schema dict consumed by @function_tool(raw_schema=...).
"""
from app.voicebot.schema_compact import compact_raw_schema

raw_schema = {

    # ── Driver inbound ────────────────────────────────────────────────────────

    "check_upcoming_trips": {
        "type": "function",
        "name": "check_upcoming_trips",
        "description": (
            "Count/list trips by scope. Default: say the COUNT and ask which trip to detail — "
            "do not read the full list. General questions ('how many trips') → scope=all. "
            "trip_index = one trip's details. list_all=true only when driver asks to read each trip."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": ["in_progress", "not_picked_up", "picked_up", "awaiting_confirmation", "new", "all"],
                    "description": (
                        "in_progress=accepted running; not_picked_up=not yet in car; "
                        "picked_up=in car; awaiting_confirmation=offered; new=just created; all=every group."
                    ),
                },
                "trip_index": {
                    "type": "integer",
                    "description": "Index (1 = first) when the driver picks one trip for details/fare.",
                },
                "list_all": {
                    "type": "boolean",
                    "description": "true only when the driver asks to hear every trip listed aloud.",
                },
            },
            "required": ["scope"],
        },
    },

    "create_walkup_trip": {
        "type": "function",
        "name": "create_walkup_trip",
        "description": (
            "Add a street-hail / walk-up trip for the driver. Lands as confirmed (in progress), "
            "no accept banner. Before calling you MUST have: customer phone, pickup, drop-off; "
            "ask about bulky goods and traveling with children (default no). Name/note optional. "
            "Not for customer booking."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "customer_phone": {
                    "type": "string",
                    "description": "Walk-up customer phone number.",
                },
                "pickup_address": {
                    "type": "string",
                    "description": "Pickup address.",
                },
                "dropoff_address": {
                    "type": "string",
                    "description": "Drop-off address.",
                },
                "customer_name": {
                    "type": "string",
                    "description": "Customer name if known.",
                },
                "note": {
                    "type": "string",
                    "description": "Optional free-form note.",
                },
                "has_bulky_goods": {
                    "type": "boolean",
                    "description": "true if the customer has bulky goods.",
                },
                "with_children": {
                    "type": "boolean",
                    "description": "true if traveling with children.",
                },
            },
            "required": ["customer_phone", "pickup_address", "dropoff_address"],
        },
    },

    "refresh_latest_data": {
        "type": "function",
        "name": "refresh_latest_data",
        "description": (
            "Re-fetch live data for the cached topic just answered (schedule, earnings, "
            "current trip, …). Only call when the driver asks to refresh/update/get the latest. "
            "Do NOT call proactively."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_current_trip_info": {
        "type": "function",
        "name": "get_current_trip_info",
        "description": (
            "Active trip: customer, phone number, addresses, fare, ETA, status. "
            "Use for current trip, customer phone, how much is this ride."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "suggest_next_stop": {
        "type": "function",
        "name": "suggest_next_stop",
        "description": (
            "Suggest which pickup/dropoff the driver should head to NEXT, based on their current "
            "location and their whole schedule (both not-yet-picked-up and already-picked-up-"
            "awaiting-dropoff trips) — picks whichever is closest. Use when the driver asks "
            "'where should I go next', 'who should I pick up or drop off now', 'what's my next "
            "stop'. Different from check_upcoming_trips: that one just lists trips by status, it "
            "does NOT rank by distance/location — use this tool when the driver wants a "
            "recommendation of where to go, not just a list."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_optimal_route": {
        "type": "function",
        "name": "get_optimal_route",
        "description": (
            "Gives the OPTIMAL ORDER to visit ALL currently pending pickup/dropoff stops, based "
            "on real road distance (not straight-line). Use when the driver has 2 OR MORE pending "
            "stops and asks 'what order should I go in', 'what's my optimal route', 'sort out my "
            "stops for me', 'what's the fastest way to hit all these stops', 'how should I plan "
            "my day'. ALWAYS available when asked, not gated by any setting. Different from "
            "suggest_next_stop (only suggests the single NEAREST stop next, needs a setting "
            "enabled for it to fire proactively, but still answers when asked directly) and "
            "check_upcoming_trips (only lists trips by status, does NOT compute an optimal "
            "distance/time-based order). If the driver has 0 or 1 pending stops, the tool will "
            "just report there's nothing to order — no need to ask first."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_trip_traffic": {
        "type": "function",
        "name": "get_trip_traffic",
        "description": (
            "Traffic conditions for a trip: congestion, ETA, route summary. "
            "Use for 'any traffic', 'jammed', 'how long to get there'. "
            "Data from Google Maps at trip creation."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "trip_index": {
                    "type": "integer",
                    "description": "Trip number (1 = nearest). Omit for current/nearest trip.",
                }
            },
            "required": [],
        },
    },

    "update_trip_status": {
        "type": "function",
        "name": "update_trip_status",
        "description": (
            "Update the status of the driver's current trip. "
            "Use when the driver says they've arrived at pickup, picked up the passenger, or completed the trip."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["ARRIVED_PICKUP", "PICKED_UP", "COMPLETED"],
                    "description": "New trip status.",
                }
            },
            "required": ["status"],
        },
    },

    "call_customer": {
        "type": "function",
        "name": "call_customer",
        "description": (
            "Call the customer of one trip. Two main modes: "
            "agent = AI calls on your behalf, you listen live (DEFAULT for relay/confirm); "
            "bridge = you speak directly with the customer. "
            "background = AI calls in a separate room, you don't listen live (only when asked). "
            "Multiple trips: ask which, or call without trip_index to list. "
            "After agent/bridge: stay silent — system already said Calling."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["background", "agent", "bridge"],
                    "description": (
                        "'agent' (default) = AI calls, driver listens live; "
                        "'bridge' = driver talks directly; "
                        "'background' = AI calls in background, driver not on the line."
                    ),
                },
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Trip number from the list THIS tool just read out (1 = first) — only "
                        "needed when the driver has more than 1 trip and has already picked one. "
                        "Leave empty if there's only 1 trip, or if you haven't asked yet."
                    ),
                },
                "message": {
                    "type": "string",
                    "description": (
                        "mode='agent' only. The exact content the AI must say to the customer as "
                        "soon as they pick up, before anything else (e.g. invite them to the "
                        "pickup point, remind them to get ready to get out) — required when this "
                        "call follows a proactive nudge (approaching pickup/dropoff). Leave empty "
                        "if the driver just wants a generic call with no specific content to "
                        "deliver first."
                    ),
                },
            },
            "required": ["mode"],
        },
    },

    "call_custom_number": {
        "type": "function",
        "name": "call_custom_number",
        "description": (
            "Step 1: Call ANY phone number the driver reads aloud — not the current trip's customer "
            "(e.g. family, office, another person). Do NOT dial immediately — read the number back "
            "for confirmation first. After the driver confirms ('yes', 'call it', 'go ahead'), call "
            "confirm_call_custom_number. For the trip's customer → use call_customer, not this tool."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {
                    "type": "string",
                    "description": "Phone number as the driver said it (e.g. '0912345678').",
                },
                "contact_name": {
                    "type": ["string", "null"],
                    "description": "Optional label if the driver named who to call (e.g. 'my wife').",
                },
            },
            "required": ["phone_number"],
        },
    },

    "confirm_call_custom_number": {
        "type": "function",
        "name": "confirm_call_custom_number",
        "description": (
            "Step 2: Place the custom-number call after the driver confirmed the number via call_custom_number."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "find_contact": {
        "type": "function",
        "name": "find_contact",
        "description": (
            "Step 1: Find someone in the driver's PHONE CONTACTS by name (not the trip customer). "
            "Reads back matches for confirmation, or asks to pick if multiple matches "
            "(select_contact_match). After confirmation and call mode, use confirm_contact_call."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "contact_name": {
                    "type": "string",
                    "description": "Name as the driver said it (e.g. 'John', 'my wife').",
                },
            },
            "required": ["contact_name"],
        },
    },

    "select_contact_match": {
        "type": "function",
        "name": "select_contact_match",
        "description": (
            "Only when find_contact returned MULTIPLE matches and the driver clarifies who "
            "(e.g. 'the first one', 'number 2')."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "selection": {
                    "type": "string",
                    "description": "What the driver said to pick from the list just read.",
                },
            },
            "required": ["selection"],
        },
    },

    "confirm_contact_call": {
        "type": "function",
        "name": "confirm_contact_call",
        "description": (
            "Final step: call a confirmed contact from find_contact. Requires mode: "
            "background (AI calls separately), agent (AI calls in-room), or bridge (driver talks directly)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["background", "agent", "bridge"],
                    "description": "'agent' default = AI calls, driver listens; 'bridge' = direct; 'background' = AI only.",
                },
                "message": {
                    "type": ["string", "null"],
                    "description": "For mode='agent' only — message for AI to say when they pick up.",
                },
            },
            "required": ["mode"],
        },
    },

    "send_sms_to_customer": {
        "type": "function",
        "name": "send_sms_to_customer",
        "description": (
            "Send a free-text SMS to the current trip's customer with content the driver dictates. "
            "Different from confirm_trip_with_customer (fixed template)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "SMS body exactly as the driver said it.",
                },
            },
            "required": ["message"],
        },
    },

    "send_sms_to_custom_number": {
        "type": "function",
        "name": "send_sms_to_custom_number",
        "description": (
            "Step 1: SMS any phone number the driver reads — not the trip customer. "
            "Read back number and message for confirmation first, then confirm_send_sms_to_custom_number."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "phone_number": {"type": "string", "description": "Phone number as the driver said it."},
                "message": {"type": "string", "description": "SMS body as the driver said it."},
                "contact_name": {
                    "type": ["string", "null"],
                    "description": "Optional label (e.g. 'my wife').",
                },
            },
            "required": ["phone_number", "message"],
        },
    },

    "confirm_send_sms_to_custom_number": {
        "type": "function",
        "name": "confirm_send_sms_to_custom_number",
        "description": "Step 2: Send SMS after driver confirmed number and message via send_sms_to_custom_number.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "find_contact_to_message": {
        "type": "function",
        "name": "find_contact_to_message",
        "description": (
            "Step 1: Find a contact by name to TEXT (not call). After confirmation and message content, "
            "use confirm_send_sms_to_contact. For calling a contact → find_contact."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "contact_name": {
                    "type": "string",
                    "description": "Name as the driver said it.",
                },
            },
            "required": ["contact_name"],
        },
    },

    "select_contact_match_for_sms": {
        "type": "function",
        "name": "select_contact_match_for_sms",
        "description": "Pick one contact when find_contact_to_message returned multiple matches.",
        "parameters": {
            "type": "object",
            "properties": {
                "selection": {
                    "type": "string",
                    "description": "What the driver said to pick from the list.",
                },
            },
            "required": ["selection"],
        },
    },

    "confirm_send_sms_to_contact": {
        "type": "function",
        "name": "confirm_send_sms_to_contact",
        "description": (
            "Final step: send SMS to a confirmed contact. Requires message — do not call without content."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "description": "SMS body for this contact.",
                },
            },
            "required": ["message"],
        },
    },

    "get_customer_location": {
        "type": "function",
        "name": "get_customer_location",
        "description": (
            "Get the current pickup location of the customer. "
            "Use when the driver asks 'where is the customer', 'where's the pickup', 'pickup address'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "confirm_trip_with_customer": {
        "type": "function",
        "name": "confirm_trip_with_customer",
        "description": (
            "Send an SMS confirmation to the customer. "
            "Use when the driver wants to notify the customer they've accepted the trip and are on the way."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "summarize_last_call": {
        "type": "function",
        "name": "summarize_last_call",
        "description": (
            "Retrieve and read the summary of the last customer call. "
            "If a background call is still in progress, tell the driver to wait. "
            "Use when the driver asks 'what did they say', 'summarize the call', 'is the call done'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "check_customer_call_status": {
        "type": "function",
        "name": "check_customer_call_status",
        "description": (
            "Check whether a background customer call is still in progress. "
            "Use when the driver asks 'is the call done', 'still calling the customer'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "create_reminder": {
        "type": "function",
        "name": "create_reminder",
        "description": (
            "Set an automatic reminder before the scheduled pickup time. "
            "Use when the driver says 'remind me', 'set a reminder', 'alert me X minutes before'. "
            "Default minutes_before is 10 if unspecified."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "minutes_before": {
                    "type": ["integer", "null"],
                    "description": "Minutes before pickup to send the reminder. Defaults to 10.",
                }
            },
            "required": [],
        },
    },

    "request_cancel_trip": {
        "type": "function",
        "name": "request_cancel_trip",
        "description": (
            "Step 1: Ask for confirmation before cancelling the active trip. "
            "Use when the driver wants to cancel. Do NOT cancel immediately — always confirm first."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "confirm_cancel_trip": {
        "type": "function",
        "name": "confirm_cancel_trip",
        "description": (
            "Step 2: Execute the cancellation after the driver has confirmed. "
            "Only call after request_cancel_trip and the driver said 'yes'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Earnings & profile ────────────────────────────────────────────────────

    "get_today_earnings": {
        "type": "function",
        "name": "get_today_earnings",
        "description": (
            "View today's earnings summary: total revenue, trip count, bonuses, hours online. "
            "Use when the driver asks 'how much have I earned today', 'today's income', 'my earnings'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_earnings_summary": {
        "type": "function",
        "name": "get_earnings_summary",
        "description": (
            "View earnings for the last 7 days (week) or 30 days (month). "
            "Use for 'this week', 'this month'. Do NOT invent lifetime totals — say unsupported."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "period": {
                    "type": "string",
                    "enum": ["week", "month"],
                    "description": "week = last 7 days; month = last 30 days.",
                }
            },
            "required": ["period"],
        },
    },

    "check_trip_history": {
        "type": "function",
        "name": "check_trip_history",
        "description": (
            "Count completed or cancelled trips today from loaded context. "
            "Use for 'how many trips did I finish today' or 'any cancellations today'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "scope": {
                    "type": "string",
                    "enum": ["completed_today", "cancelled_today"],
                    "description": "completed_today or cancelled_today.",
                }
            },
            "required": ["scope"],
        },
    },

    "get_driver_stats": {
        "type": "function",
        "name": "get_driver_stats",
        "description": (
            "View driver statistics: star rating, acceptance rate, completion rate, total trips. "
            "Use when the driver asks 'what's my rating', 'my acceptance rate', 'my stats'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_bonus_info": {
        "type": "function",
        "name": "get_bonus_info",
        "description": (
            "Check active bonuses and surge pricing zones. "
            "Use when the driver asks 'any bonuses', 'surge areas', 'promotions today'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── Trip issue reporting ──────────────────────────────────────────────────

    "report_customer_no_show": {
        "type": "function",
        "name": "report_customer_no_show",
        "description": (
            "Report that the customer did not appear at the pickup point. "
            "Use when the driver has waited but the customer is not there. "
            "Always confirm with the driver before reporting."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "report_trip_issue": {
        "type": "function",
        "name": "report_trip_issue",
        "description": (
            "Report an issue with the current trip: safety concern, vehicle damage, "
            "inappropriate behavior, wrong address, etc."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "issue_type": {
                    "type": "string",
                    "enum": ["safety_concern", "vehicle_damage", "inappropriate_behavior", "wrong_address", "other"],
                    "description": "Type of issue to report.",
                },
                "description": {
                    "type": ["string", "null"],
                    "description": "Optional additional details about the issue.",
                },
            },
            "required": ["issue_type"],
        },
    },

    "extend_wait_time": {
        "type": "function",
        "name": "extend_wait_time",
        "description": (
            "Request additional wait time at the pickup point. "
            "Use when the driver needs more time before the no-show timer expires."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "minutes": {
                    "type": "integer",
                    "description": "Extra minutes to wait (1-10).",
                }
            },
            "required": ["minutes"],
        },
    },

    # ── Driver availability ───────────────────────────────────────────────────

    "set_driver_status": {
        "type": "function",
        "name": "set_driver_status",
        "description": (
            "Toggle driver availability: online (accepting trips) or offline (taking a break). "
            "Use when the driver says 'I want to go offline', 'end my shift', or 'go back online'."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "online": {
                    "type": "boolean",
                    "description": "True to go online and accept trips, False to go offline.",
                }
            },
            "required": ["online"],
        },
    },

    # ── Driver outbound ───────────────────────────────────────────────────────

    "confirm_trip": {
        "type": "function",
        "name": "confirm_trip",
        "description": (
            "Confirm acceptance of a new trip. "
            "Use when the driver agrees, says 'yes', 'accept', or 'I'll take it'. "
            "If the driver has MORE THAN 1 trip awaiting confirmation right now, call this "
            "WITHOUT trip_index first — it reads back a list and asks which one. Read that back "
            "to the driver, wait for them to pick, then call again with the right trip_index. "
            "During an outbound call about a single new trip offer, no trip_index is ever needed."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Trip number from the most recent 'which trip' listing (1 = first). Only "
                        "needed when the driver has multiple trips awaiting confirmation."
                    ),
                }
            },
            "required": [],
        },
    },

    "reject_trip": {
        "type": "function",
        "name": "reject_trip",
        "description": (
            "Decline a new trip. "
            "Use when the driver refuses, says 'no', 'decline', or 'I'm busy'. "
            "If the driver has MORE THAN 1 trip awaiting confirmation right now, call this "
            "WITHOUT trip_index first — it reads back a list and asks which one. Read that back "
            "to the driver, wait for them to pick, then call again with the right trip_index. "
            "During an outbound call about a single new trip offer, no trip_index is ever needed."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "trip_index": {
                    "type": "integer",
                    "description": (
                        "Trip number from the most recent 'which trip' listing (1 = first). Only "
                        "needed when the driver has multiple trips awaiting confirmation."
                    ),
                }
            },
            "required": [],
        },
    },

    # ── Customer agent ────────────────────────────────────────────────────────

    "get_my_trip": {
        "type": "function",
        "name": "get_my_trip",
        "description": (
            "Get the customer's current trip information: status, driver, ETA, addresses. "
            "Use when the customer asks 'is my driver coming', 'trip status', 'where is my driver', 'how long'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "cancel_my_trip": {
        "type": "function",
        "name": "cancel_my_trip",
        "description": (
            "Cancel the customer's trip. "
            "Only call after the customer confirms. "
            "Always ask first: 'Are you sure you want to cancel your trip?'"
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "get_driver_eta": {
        "type": "function",
        "name": "get_driver_eta",
        "description": (
            "Get the driver's ETA and current location. "
            "Use when the customer asks 'how long', 'is the driver close', 'when will they arrive'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    # ── App playbook / FAQ (RAG) ──────────────────────────────────────────────

    "answer_app_faq": {
        "type": "function",
        "name": "answer_app_faq",
        "description": (
            "Search the app user playbook (RAG) for how-to and FAQ answers about app features, "
            "workflows, and general help — NOT live trip data. "
            "Use when the user asks: 'what does the app support', 'how do I book a ride', "
            "'how to use the voice assistant', 'what features are available', "
            "or any general app guide / FAQ question."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "The user's original question about the app or how to use it.",
                }
            },
            "required": ["question"],
        },
    },
    "end_call": {
        "type": "function",
        "name": "end_call",
        "description": (
            "Proactively end the call with the AI assistant at the driver's request. "
            "Call when the driver says goodbye or asks to stop/end the assistant, e.g. "
            "'bye', 'that's it, hang up', 'end the assistant', 'stop the call'. "
            "Do NOT call this if the driver is just pausing or busy with something else."
        ),
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
        },
    },
}

raw_schema = compact_raw_schema(raw_schema)
