import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import {
  consumeClosePanelOnVoiceIdle,
  useVoiceSessionStore,
} from "../stores/voiceSessionStore";
import { useAssistantChatStore } from "../stores/assistantChatStore";

/**
 * After the driver hangs up (orb while chat open), close the chat overlay and
 * return to Home. Silence timeout / remote drop leaves the panel open so
 * tapping Trợ lý can reconnect without hunting for the orb flow.
 */
export function useReturnHomeOnVoiceEnd() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useVoiceSessionStore((s) => s.status);
  const prevStatus = useRef(status);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    const wasInSession = prev === "connected" || prev === "connecting";
    if (!wasInSession || status !== "idle") return;

    if (!consumeClosePanelOnVoiceIdle()) return;

    useAssistantChatStore.getState().closePanel();
    if (pathname !== "/") {
      router.replace("/");
    }
  }, [status, pathname, router]);
}
