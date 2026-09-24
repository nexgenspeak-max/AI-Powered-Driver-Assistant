from livekit.agents import RunContext, function_tool
from app.voicebot.locales.en.tools_definition import raw_schema
from app.voicebot.processors import context_store
from app.voicebot.processors.tool_response_builders import build_route_response


@function_tool(raw_schema=raw_schema["get_optimal_route"])
async def get_optimal_route(raw_arguments: dict, context: RunContext) -> str:
    route = context_store.get_optimized_route(context.userdata)
    reply = build_route_response(route, lang="en")
    return await context_store.speak_with_refresh_offer(
        context.session, context.userdata, "optimal_route", reply, lang="en"
    )
