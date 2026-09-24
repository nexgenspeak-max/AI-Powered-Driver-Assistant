"""
One-time setup: creates LiveKit SIP Inbound Trunk + Dispatch Rule.

Run once before starting the voice agent:
  python scripts/setup_sip.py

Then configure Twilio:
  1. Twilio Console → Voice → SIP Trunks → Create a SIP Trunk
  2. Under Termination: add SIP URI from this script's output
  3. Assign your Twilio phone number to the trunk
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv("envs/.env.local")

from livekit import api


async def setup():
    lk = api.LiveKitAPI(
        url=os.getenv("LIVEKIT_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
    )

    # 1. Create Inbound SIP Trunk (reuse if already exists)
    print("→ Checking existing SIP Inbound Trunks...")
    existing = await lk.sip.list_inbound_trunk(api.ListSIPInboundTrunkRequest())
    trunk_id = None
    for t in existing.items:
        if t.name == "driver-assistant-inbound":
            trunk_id = t.sip_trunk_id
            print(f"   ♻️  Reusing existing Trunk ID: {trunk_id}")
            break

    if not trunk_id:
        print("→ Creating SIP Inbound Trunk...")
        trunk = await lk.sip.create_inbound_trunk(
            api.CreateSIPInboundTrunkRequest(
                trunk=api.SIPInboundTrunkInfo(
                    name="driver-assistant-inbound",
                    numbers=[os.getenv("TWILIO_PHONE_NUMBER", "")],
                    krisp_enabled=True,
                )
            )
        )
        trunk_id = trunk.sip_trunk_id
        print(f"   ✅ Trunk ID: {trunk_id}")

    # 2. Create Dispatch Rule (reuse if already exists)
    print("→ Checking existing Dispatch Rules...")
    existing_rules = await lk.sip.list_dispatch_rule(api.ListSIPDispatchRuleRequest())
    rule_id = None
    for r in existing_rules.items:
        if r.name == "driver-assistant-dispatch":
            rule_id = r.sip_dispatch_rule_id
            print(f"   ♻️  Reusing existing Dispatch Rule ID: {rule_id}")
            break

    if not rule_id:
        print("→ Creating Dispatch Rule...")
        rule = await lk.sip.create_sip_dispatch_rule(
            api.CreateSIPDispatchRuleRequest(
                trunk_ids=[trunk_id],
                name="driver-assistant-dispatch",
                rule=api.SIPDispatchRule(
                    dispatch_rule_individual=api.SIPDispatchRuleIndividual(
                        room_prefix="driver-call-",
                    ),
                ),
            )
        )
        rule_id = rule.sip_dispatch_rule_id
        print(f"   ✅ Dispatch Rule ID: {rule_id}")

    await lk.aclose()

    print()
    print("=" * 60)
    print("✅ LiveKit SIP setup complete!")
    print()
    print("Now configure Twilio:")
    print("1. Twilio Console → Voice → SIP Trunks → Create Trunk")
    print("2. Termination → SIP URI:")
    livekit_host = os.getenv("LIVEKIT_URL", "").replace("wss://", "").replace("ws://", "")
    print(f"   sip:{livekit_host}")
    print("3. Assign your Twilio number to this trunk")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(setup())
