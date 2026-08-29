"""English keyword-to-tool mapping.

Kept short: JSON tool schemas already carry the long descriptions. Extra
tokens here were ~4k on every turn and pushed confirm_trip LLM TTFT over 1.6s.
"""

TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
Cache-read tools speak themselves. After they speak → stay silent; do not repeat the list.

check_upcoming_trips — schedule/trip count/fare. Tool says count first; trip_index for one trip's details.
refresh_latest_data — when the driver wants fresh data after a cache answer ("refresh", "update", "get the latest").
get_current_trip_info — in-progress trip, customer phone (not GPS-ranked).
suggest_next_stop — where to go / who I'm picking up (GPS).
get_trip_traffic — traffic, congestion, how long.
get_optimal_route — best route.
confirm_trip — accept/yes/ok an unconfirmed trip. Multiple waiting: call without trip_index first, then again with number or name.
reject_trip — decline an unconfirmed trip (same selection). Already accepted → request_cancel_trip.
update_trip_status — progress on an accepted trip: arrived_pickup / picked_up / completed. Not for accepting a new trip.
call_customer — call the rider. Multiple trips: ask who. Ask mode agent/bridge/background. Nudge "want me to call" → mode=agent with a reason message.
call_custom_number → confirm_call_custom_number — any number; always read the number back first.
find_contact → confirm_contact_call — call by phonebook name; same mode question as call_customer.
send_sms_to_customer — free-text SMS to the current trip's rider.
send_sms_to_custom_number → confirm_send_sms_to_custom_number — SMS to any number; read back first.
find_contact_to_message → confirm_send_sms_to_contact — SMS by phonebook name.
get_customer_location — where is the rider / pickup.
confirm_trip_with_customer — canned trip-confirmation SMS.
summarize_last_call — what was said on the last call.
check_customer_call_status — is the background call done.
create_reminder — remind me before pickup.
request_cancel_trip → confirm_cancel_trip — cancel an accepted trip; always confirm first.
get_today_earnings — today's earnings.
get_driver_stats — rating, stats.
get_bonus_info — bonus, surge, promo.
report_customer_no_show — rider didn't show; confirm first.
report_trip_issue — report a problem.
extend_wait_time — wait longer.
set_driver_status — go online/offline.
answer_app_faq — app how-to / FAQ, not live trip data.
end_conversation — goodbye, hang up the assistant.
</KeywordsMappingForToolUsage>
"""

OUTBOUND_TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
Only two tools: confirm_trip (accept/yes/ok) or reject_trip (no/busy/decline).
Tools speak themselves. After they speak → stay silent.
</KeywordsMappingForToolUsage>
"""

CUSTOMER_TOOLS_MAPPING_PROMPT = """<KeywordsMappingForToolUsage>
book_trip — book a ride. Ask for name, pickup, dropoff, now vs scheduled, phone.
get_my_trip — is my driver coming, trip status, where is the driver.
request_cancel_my_trip → confirm_cancel_my_trip — cancel; always confirm first.
get_driver_eta — how long until the driver arrives.
call_driver — talk to the driver. If not yet confirmed, ask them to wait; do not call the tool.
answer_app_faq — app how-to / FAQ.
</KeywordsMappingForToolUsage>
"""
