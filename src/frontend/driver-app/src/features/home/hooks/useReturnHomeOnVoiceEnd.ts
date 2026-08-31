import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "expo-router";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import { useAssistantChatStore } from "../stores/assistantChatStore";

/**
 * After the driver hangs up or the bot ends the session (silence timeout),
 * close the chat overlay and return to Home so the map is visible again.
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

    useAssistantChatStore.getState().closePanel();
    if (pathname !== "/") {
      router.replace("/");
    }
  }, [status, pathname, router]);
}
