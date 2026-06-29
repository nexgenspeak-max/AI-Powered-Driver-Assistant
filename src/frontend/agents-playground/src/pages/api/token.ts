import { NextApiRequest, NextApiResponse } from "next";

import { TokenSourceRequestPayload } from "livekit-client";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { RoomConfiguration } from "@livekit/protocol";

const apiKey = process.env.LIVEKIT_API_KEY;
const apiSecret = process.env.LIVEKIT_API_SECRET;

type TokenRequest = {
  room_name: string;
  participant_identity: string;
  participant_name?: string;
  participant_metadata?: string;
  participant_attributes?: Record<string, string>;
  room_config?: ReturnType<RoomConfiguration["toJson"]>;
  agentName?: string;
  agent_name?: string;
  agentMetadata?: string;
  agent_metadata?: string;
};

const defaultDriverPhone =
  (process.env.TEST_DRIVER_PHONE ?? "84867347452").replace(/^\+/, "");

function livekitHttpHost(): string {
  return (process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "").replace(/^wss:/, "https:");
}

function normalizeRoomName(name: string | undefined): string {
  if (!name || /^room-[a-z0-9]+$/i.test(name)) {
    return `driver-${defaultDriverPhone}-${Math.floor(Date.now() / 1000)}`;
  }
  return name;
}

// This route handler creates a token for a given room and participant
// it's compatible with LiveKit's TokenSourceEndpoint API
async function createToken(request: TokenRequest) {
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: request.participant_identity,
      // Token to expire after 10 minutes
      ttl: "10m",
    },
  );

  at.addGrant({
    roomJoin: true,
    room: request.room_name,
    canUpdateOwnMetadata: true,
    canPublish: true,
    canSubscribe: true,
  });

  if (request.participant_name) {
    at.name = request.participant_name;
  }
  if (request.participant_identity) {
    at.identity = request.participant_identity;
  }
  if (request.participant_metadata) {
    at.metadata = request.participant_metadata;
  }
  if (request.participant_attributes) {
    at.attributes = request.participant_attributes;
  }
  if (request.room_config) {
    at.roomConfig = RoomConfiguration.fromJson(request.room_config);
  } else {
    const agentName = request.agentName ?? request.agent_name;
    if (agentName) {
      at.roomConfig = RoomConfiguration.fromJson({
        agents: [
          {
            agentName,
            metadata: request.agentMetadata ?? request.agent_metadata ?? "",
          },
        ],
      });
    }
  }

  return at.toJwt();
}

export default async function handleToken(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }
  if (!apiKey || !apiSecret) {
    res.statusMessage = "Environment variables aren't set up correctly";
    res.status(500).end();
    return;
  }

  const options = req.body ?? {};
  options.room_name = normalizeRoomName(
    options.room_name ?? options.roomName,
  );
  options.participant_identity =
    options.participant_identity ??
    options.participantName ??
    `driver-${defaultDriverPhone}`;
  options.participant_name =
    options.participant_name ?? options.participantName ?? "Test Driver";
  options.agentName =
    options.agentName ||
    options.agent_name ||
    process.env.DEFAULT_AGENT_NAME ||
    "driver-assistant-local";

  try {
    const agentName = options.agentName as string;
    const roomName = options.room_name as string;

    // Explicit dispatch — same as trip-service /voice/token
    try {
      const dispatch = new AgentDispatchClient(
        livekitHttpHost(),
        apiKey,
        apiSecret,
      );
      await dispatch.createDispatch(roomName, agentName);
    } catch (dispatchErr) {
      console.warn("agent dispatch failed (non-fatal):", dispatchErr);
    }

    res.status(200).json({
      server_url: process.env.NEXT_PUBLIC_LIVEKIT_URL,
      participant_token: await createToken(options),
    });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).send({ message: "Generating token failed" });
  }
}
