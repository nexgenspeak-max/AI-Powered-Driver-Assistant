"""
Base mixin for all tool groups.

Each tool module defines a mixin class whose methods are decorated with
@function_tool. DriverAgent inherits from all mixins, so the LiveKit
agents framework discovers them automatically.

Tool methods can access agent state via `self` (e.g. self._driver_phone).
"""
import logging

logger = logging.getLogger("voice-agent.tools")
