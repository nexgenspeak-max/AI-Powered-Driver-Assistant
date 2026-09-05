"""How to turn a bad live driver session into a failing→fixed pytest.

1. From voice-agent log, copy `[DRIVER]` / `[AI]` / `spoken_intent` / `pending_action` lines.
2. Add cases to:
   - `tests/test_driver_usecase_matrix.py` (full intent matrix — prefer this)
   - `tests/test_live_session_driver_qa.py` (session-specific pending/multi-turn)
3. Run:
   `pytest tests/test_driver_usecase_matrix.py tests/test_live_session_driver_qa.py -q`
   Must fail on old code.
4. Fix processors (`spoken_intent`, `conversational_ack`, `pending_action`, tools).
5. Re-run until green. Restart `python -m app.main dev` before phone retest.

Do **not** rely on ad-hoc phone roleplay alone for routing bugs — text-in
fixtures catch period/ack/pending/collision mistakes that spoken E2E often miss.
"""
