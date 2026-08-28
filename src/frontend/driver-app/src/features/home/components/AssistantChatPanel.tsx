import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from "react-native";
import { View, XStack, Text, Theme, useTheme } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSheen, CTA_GRADIENT } from "../../../components/LiquidGlass";
import { KeyboardSafeView } from "../../../components/KeyboardSafeView";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  setAudioModeAsync,
} from "expo-audio";
import { useAssistantChatStore } from "../stores/assistantChatStore";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import { useThemeStore } from "../../../stores/themeStore";
import { getAssistantReply } from "../../../services/api/assistant";
import { MAP_OVERLAY_BOTTOM_CLEARANCE } from "../../../constants";

const MIC_LABEL = {
  idle: "Chạm vào quả cầu để kết nối với trợ lý",
  connecting: "Đang kết nối...",
  connected: "Đang trong phiên thoại — chạm vào quả cầu để ngắt",
  error: "Kết nối lỗi, thử lại",
};

// Recorded audio cues (not device TTS) played while connecting — see the
// effect below for why. One is picked at random per connect by
// voiceSessionStore (`connectingCueIndex`), which also delays the real
// LiveKit connect by that same file's length (`CONNECTING_CUE_DURATIONS_MS`)
// — index here must line up with that array.
const connectingCueAssets = [
  require("../../../../assets/audio/connecting-cue.mp3"),
  require("../../../../assets/audio/connecting-cue-2.mp3"),
  require("../../../../assets/audio/connecting-cue-3.mp3"),
];

interface Props {
  // Set when rendered as the tap-to-open overlay on Home (see index.tsx) —
  // shows a close (X) button next to the status label. Omitted wherever this
  // might still be rendered as permanent full-screen content instead.
  onClose?: () => void;
}

export function AssistantChatPanel({ onClose }: Props = {}) {
  const themeMode = useThemeStore((s) => s.mode);
  const isLight = themeMode === "light";
  const theme = useTheme();
  const { chats, addUserMessage, addBotMessage } = useAssistantChatStore();
  const voice = useVoiceSessionStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stubLoading, setStubLoading] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const connectingCuePlayer = useAudioPlayer(
    connectingCueAssets[voice.connectingCueIndex],
  );
  const connectingCueStatus = useAudioPlayerStatus(connectingCuePlayer);

  // TEMP DEBUG: prints whether the asset actually loaded and what the
  // player thinks its own state is. Remove once resolved.
  useEffect(() => {
    console.log(
      "[connecting-cue] status:",
      JSON.stringify(connectingCueStatus),
    );
  }, [connectingCueStatus]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chats]);

  // Recorded audio cue (not device TTS — LiveKit hasn't connected yet at
  // this point, and a spoken phrase doesn't cover a slow connect: token
  // fetch + room connect + mic setup can run well past a single phrase's
  // length, leaving silence again with no way to tell "still connecting"
  // from "it froze") so a driver who triggered this hands-free (wake-word,
  // not looking at the screen) keeps getting audible feedback for however
  // long the connect actually takes. Looped while connecting, stopped
  // immediately on any other status so it can never talk over the AI's own
  // voice once the real session starts, or linger after an error.
  useEffect(() => {
    // A fresh player (never played yet, still finishing its initial load)
    // already sits at position 0 — calling seekTo(0) on it anyway lands
    // right in the middle of that load/decode pipeline and is the likely
    // cause of a reported first-play glitch (plays a word, then stalls).
    // Once it's actually played through at least once, currentTime is
    // nonzero and a real seek-back is needed. Guarding on currentTime skips
    // the redundant/risky seek exactly for that first-ever play.
    const resetToStart = () => {
      if (connectingCuePlayer.currentTime !== 0) connectingCuePlayer.seekTo(0);
    };

    console.log("[connecting-cue] voice.status changed to", voice.status);

    // Only a genuine abort (error, or back to idle) cuts the cue off — a
    // fast connect succeeding (status -> 'connected') lets it finish
    // playing naturally instead. It's short (~2.5s) and single-play, so on
    // a quick connect the only cost is a brief overlap with the AI's first
    // words — the alternative (reported) was the cue getting chopped down
    // to 1-2 words every time the connect happened to be fast.
    if (voice.status === "idle" || voice.status === "error") {
      connectingCuePlayer.pause();
      resetToStart();
      return;
    }
    if (voice.status !== "connecting") return;
    // Auto-triggered by a pending nudge (useAutoConnectOnNudge.ts), not a
    // driver tap — connect() already skips its own artificial delay for
    // this case, and playing a "connecting..." cue the driver never asked
    // for would just add a spoken-content collision with the nudge itself.
    if (voice.silentConnect) return;
    let cancelled = false;
    (async () => {
      try {
        // Drivers commonly keep the phone on silent/vibrate — without this
        // the cue would be muted exactly when it matters most (a hands-free,
        // wake-word-triggered connect where the driver isn't looking at the
        // screen to notice anything went wrong). Awaited — calling play()
        // before this actually resolves can start playback on whatever audio
        // mode was still active beforehand, silencing it.
        //
        // interruptionMode: 'mixWithOthers' — confirmed via logging that the
        // cue *was* actually playing (currentTime advancing) but got paused
        // ~0.7s in, exactly when LiveKit's own `startAudioSession()` request
        // its audio focus. expo-audio's default focus-loss handling pauses
        // playback even on a transient/"may duck" loss; requesting no focus
        // at all (Android-only effect per the docs) sidesteps that entirely
        // — there's nothing for LiveKit's request to take away.
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "mixWithOthers",
        });
        console.log("[connecting-cue] audio mode set, cancelled=", cancelled);
        if (cancelled) return;
        connectingCuePlayer.loop = false;
        connectingCuePlayer.volume = 1.0;
        resetToStart();
        connectingCuePlayer.play();
        console.log(
          "[connecting-cue] play() called | isLoaded=",
          connectingCuePlayer.isLoaded,
          "duration=",
          connectingCuePlayer.duration,
        );
      } catch (err) {
        console.error("[connecting-cue] failed to play", err);
      }
    })();
    // No forced pause here — this cleanup fires on *any* status change away
    // from 'connecting', including a successful 'connected', and pausing
    // unconditionally is exactly what was cutting the cue down to 1-2 words
    // on a fast connect. `cancelled` only stops a same-tick play() that
    // hasn't fired yet; the idle/error branch above (next run of this same
    // effect) is what actually stops sound for a real abort. True unmounts
    // are handled by the separate effect below.
    return () => {
      cancelled = true;
    };
  }, [voice.status, connectingCuePlayer]);

  // Stops the cue if the screen itself unmounts while it's still
  // playing/pending — the status-driven effect above intentionally no
  // longer pauses on every cleanup (see its comment), so this is the only
  // thing left to prevent an orphaned player still playing after the
  // screen is gone.
  //
  // Deliberately `[]`, not `[connectingCuePlayer]` — connectingCuePlayer is
  // a NEW player instance every time connectingCueIndex changes (random cue
  // per connect), and useAudioPlayer already auto-releases the previous
  // instance's native object when that happens. A `[connectingCuePlayer]`
  // dependency made this cleanup fire on every such swap too, calling
  // `.pause()` on the just-released old player and crashing with "Cannot
  // use shared object that was already released". The ref always points at
  // whichever player is current, so true unmount still pauses the right
  // one; the try/catch is a last-resort guard for the same race (player
  // swapped/released between the ref read and the pause() call).
  const connectingCuePlayerRef = useRef(connectingCuePlayer);
  connectingCuePlayerRef.current = connectingCuePlayer;
  useEffect(() => {
    return () => {
      try {
        connectingCuePlayerRef.current.pause();
      } catch {
        // already released — nothing to clean up
      }
    };
  }, []);

  const handleSend = async () => {
    Keyboard.dismiss();
    if (sendingRef.current) return;
    if (!msg.trim()) {
      setError("Bạn chưa nhập nội dung.");
      return;
    }
    sendingRef.current = true;
    const text = msg;
    setMsg("");
    setError(null);
    addUserMessage(text);

    try {
      if (voice.status === "connected" && (await voice.sendText(text))) {
        return;
      }

      setStubLoading(true);
      const reply = await getAssistantReply(text);
      addBotMessage(reply);
    } finally {
      setStubLoading(false);
      sendingRef.current = false;
    }
  };

  return (
    // Follows the app-wide light/dark toggle now (previously always forced
    // dark, regardless of the user's setting). Chat bubble colors below are
    // still fixed on purpose, not theme tokens: AI = white text on black,
    // user = black text on purple, in light mode specifically.
    <Theme name={themeMode}>
      <StatusBar style={isLight ? "dark" : "light"} />
      <KeyboardSafeView
        style={{ backgroundColor: theme.surface.val }}
        keyboardVerticalOffset={60}
      >
        <View width="100%" paddingTop={insets.top} position="relative">
          {/* The orb itself now lives in GlobalAssistantOrb, mounted once at
            the (app) layout level as a small draggable bubble on every tab
            (Home included) — no more full-size 360px canvas reserved here,
            so the chat list below gets the full screen instead of being
            pushed down/covered by it. */}
          <Text
            textAlign="center"
            color="$textSecondary"
            fontSize="$1"
            marginTop="$2"
            paddingTop="$2"
          >
            {voice.status === "connected" && voice.isCallActive
              ? "Đang trong cuộc gọi — không thể tắt"
              : MIC_LABEL[voice.status]}
          </Text>
          {onClose && (
            <TouchableOpacity
              onPress={onClose}
              style={{
                position: "absolute",
                right: 20,
                top: insets.top + 4,
                padding: 8,
              }}
            >
              <Ionicons name="close" size={22} color={theme.textPrimary.val} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, paddingHorizontal: 20, marginTop: 16 }}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
        >
          {chats.map((chat, i) =>
            chat.who === "me" ? (
              // User bubble: purple gradient, always white text regardless of
              // theme — the gradient itself doesn't change with light/dark,
              // so the text shouldn't need to either.
              <View
                key={i}
                maxWidth="80%"
                alignSelf="flex-end"
                borderRadius="$bubble"
                overflow="hidden"
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <Text color="#ffffff">{chat.msg}</Text>
                </LinearGradient>
              </View>
            ) : (
              // AI bubble: light card + dark text in light mode, matching the
              // rest of the light-mode UI (glass cards, dark $textPrimary) —
              // was a hardcoded black bubble/white text even in light mode,
              // which read as broken/out of place against an otherwise white
              // screen. Dark mode keeps the theme-derived $accent/$textPrimary
              // pair, unchanged.
              <View
                key={i}
                maxWidth="80%"
                alignSelf="flex-start"
                backgroundColor={isLight ? "$surfaceElevated" : "$accent"}
                borderRadius="$bubble"
                paddingHorizontal={16}
                paddingVertical={10}
              >
                <Text color="$textPrimary">{chat.msg}</Text>
              </View>
            ),
          )}
          {stubLoading && (
            <Text color="$textSecondary" fontSize="$1" paddingHorizontal="$1">
              Đang trả lời...
            </Text>
          )}
          {error && (
            <Text color="$danger" fontSize="$1" paddingHorizontal="$1">
              {error}
            </Text>
          )}
        </ScrollView>

        <XStack
          alignItems="center"
          gap="$2"
          marginHorizontal={20}
          // Was a hardcoded 100 — didn't account for the tab bar's raised
          // center "Trợ lý" button, which floats above the bar's own top
          // edge and could sit low enough to cover this composer once the
          // bar/button geometry changed. Same clearance constant the map
          // overlay cards (OptimizedRoutePanel, NavigationHud) already use.
          marginBottom={insets.bottom + MAP_OVERLAY_BOTTOM_CLEARANCE}
          paddingHorizontal="$2"
          height={48}
          borderRadius="$pill"
          backgroundColor="$surfaceElevated"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 8 }}
          shadowOpacity={0.35}
          shadowRadius={18}
        >
          <GlassSheen borderRadius={24} />
          <TextInput
            value={msg}
            onChangeText={setMsg}
            onSubmitEditing={handleSend}
            placeholder="Nói gì đó..."
            placeholderTextColor={theme.textMuted.val}
            // Highlighted-text (select-all) color — was left at the OS
            // default (a generic blue), which clashed against this app's
            // purple-branded glass fields. Brighter in dark mode (#C084FC vs
            // #8B5CF6) since a highlight needs more contrast against a dark
            // field than a light one.
            selectionColor={isLight ? "#8B5CF6" : "#C084FC"}
            style={{ flex: 1, color: theme.textPrimary.val, paddingLeft: 8 }}
          />
          <TouchableOpacity onPress={handleSend} style={{ padding: 8 }}>
            <Ionicons
              name="send"
              size={18}
              color={isLight ? "#1a1a1a" : "#fff"}
            />
          </TouchableOpacity>
        </XStack>
      </KeyboardSafeView>
    </Theme>
  );
}
