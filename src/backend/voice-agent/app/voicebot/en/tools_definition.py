"""
English tool schemas.
Each entry is a raw JSON-schema dict consumed by @function_tool(raw_schema=...).
"""

raw_schema = {

    # ── Driver inbound ────────────────────────────────────────────────────────

    "check_upcoming_trips": {
        "type": "function",
        "name": "check_upcoming_trips",
        "description": (
            "Check the driver's upcoming trip schedule. "
            "Use when the driver asks about their schedule, next trip, or trip list."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
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
            "Call the customer for the active trip. "
            "IMPORTANT: Before calling, ask the driver to choose a mode:\n"
            "  • mode='agent'  — AI calls and talks to the customer, then summarizes for the driver.\n"
            "  • mode='bridge' — Connect the driver directly to the customer.\n"
            "Only call this tool after the driver has chosen a mode."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["agent", "bridge"],
                    "description": "'agent' for AI to call and summarize, 'bridge' for direct connection.",
                }
            },
            "required": ["mode"],
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
            "Retrieve and read the summary of the last call between the driver and customer. "
            "Use when the driver asks 'what did they say', 'summarize the call', 'what did the customer want'."
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
            "Use when the driver agrees, says 'yes', 'accept', or 'I'll take it'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },

    "reject_trip": {
        "type": "function",
        "name": "reject_trip",
        "description": (
            "Decline a new trip. "
            "Use when the driver refuses, says 'no', 'decline', or 'I'm busy'."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
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
}
