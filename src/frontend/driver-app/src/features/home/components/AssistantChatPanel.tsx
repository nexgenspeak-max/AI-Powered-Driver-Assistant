import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
  StyleSheet,
} from "react-native";
import { View, XStack, YStack, Theme, useTheme } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSheen, CTA_GRADIENT } from "../../../components/LiquidGlass";
import { KeyboardSafeView } from "../../../components/KeyboardSafeView";
import { AppText } from "../../../components/AppText";
import { CzenMark } from "../../../components/CzenMark";
import { Icon } from "../../../components/icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAssistantChatStore } from "../stores/assistantChatStore";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import { useThemeStore } from "../../../stores/themeStore";
import { getAssistantReply } from "../../../services/api/assistant";
import { useVoiceLangStore } from "../../../services/voiceLang";
import { ComposerVoiceButton } from "./ComposerVoiceButton";

const STATUS_CAPTION = {
  vn: {
    idle: "Chạm nút Czen cạnh ô nhập để kết nối",
    connecting: "Đang kết nối với Czen…",
    connected: "Đã kết nối — chạm sóng âm để kết thúc",
    error: "Kết nối lỗi — chạm nút Czen để thử lại",
    inCall: "Đang trong cuộc gọi — không thể tắt",
    micOff: "Mic đang tắt — phiên vẫn kết nối",
  },
  en: {
    idle: "Tap the Czen button next to the input to connect",
    connecting: "Connecting to Czen…",
    connected: "Connected to Czen — tap the waveform to end",
    error: "Connection failed — tap the Czen button to try again",
    inCall: "In a call — can't disconnect",
    micOff: "Mic is off — the session is still connected",
  },
} as const;

const SUGGESTIONS = {
  vn: ["Lịch hôm nay", "Gọi khách", "Thu nhập hôm nay", "Nên đi đâu tiếp?"],
  en: ["Today's schedule", "Call the rider", "Today's earnings", "Where next?"],
} as const;

interface Props {
  onClose?: () => void;
}

// Small live state next to the title: Đang nghe / Đang kết nối / Mic tắt / Tắt.
function StatusChip({
  voice,
  lang,
}: {
  voice: { status: "idle" | "connecting" | "connected" | "error"; isMicMuted: boolean };
  lang: "vn" | "en";
}) {
  const theme = useTheme();
  const spec =
    voice.status === "connected" && voice.isMicMuted
      ? { label: lang === "en" ? "Mic off" : "Mic tắt", dot: theme.warning.val, bg: "$warningContainer", fg: "$onWarningContainer" }
      : voice.status === "connected"
        ? { label: lang === "en" ? "Listening" : "Đang nghe", dot: theme.success.val, bg: "$successContainer", fg: "$onSuccessContainer" }
        : voice.status === "connecting"
          ? { label: lang === "en" ? "Connecting" : "Đang kết nối", dot: theme.primary.val, bg: "$primaryContainer", fg: "$onPrimaryContainer" }
          : voice.status === "error"
            ? { label: lang === "en" ? "Error" : "Lỗi", dot: theme.danger.val, bg: "$dangerContainer", fg: "$onDangerContainer" }
            : { label: lang === "en" ? "Off" : "Tắt", dot: theme.textMuted.val, bg: "$chip", fg: "$textSecondary" };
  return (
    <XStack alignItems="center" gap={6} paddingHorizontal={10} paddingVertical={4} borderRadius="$pill" backgroundColor={spec.bg}>
      <View width={6} height={6} borderRadius={3} backgroundColor={spec.dot} />
      <AppText variant="caption" color={spec.fg}>
        {spec.label}
      </AppText>
    </XStack>
  );
}

function headerCaption(voice: {
  status: "idle" | "connecting" | "connected" | "error";
  isCallActive: boolean;
  isMicMuted: boolean;
}, lang: "vn" | "en"): string {
  const copy = STATUS_CAPTION[lang];
  if (voice.status === "connected" && voice.isCallActive) {
    return copy.inCall;
  }
  if (voice.status === "connected" && voice.isMicMuted) {
    return copy.micOff;
  }
  return copy[voice.status];
}

export function AssistantChatPanel({ onClose }: Props = {}) {
  const themeMode = useThemeStore((s) => s.mode);
  const isLight = themeMode === "light";
  const theme = useTheme();
  const { chats, addUserMessage, addBotMessage, upsertStreamingMessage } =
    useAssistantChatStore();
  const voice = useVoiceSessionStore();
  const voiceLang = useVoiceLangStore((s) => s.lang) === "en" ? "en" : "vn";
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stubLoading, setStubLoading] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chats]);

  const handleSend = () => sendText(msg);

  // Shared by the composer and the suggestion chips.
  const sendText = async (raw: string) => {
    Keyboard.dismiss();
    if (sendingRef.current) return;
    if (!raw.trim()) {
      setError("Bạn chưa nhập nội dung.");
      return;
    }
    sendingRef.current = true;
    const text = raw;
    setMsg("");
    setError(null);
    try {
      if (voice.status === "connected") {
        // Single bubble via lk.chat echo — avoid addUserMessage + echo duplicate.
        upsertStreamingMessage("me", text, true);
        if (await voice.sendText(text)) {
          return;
        }
      } else {
        addUserMessage(text);
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
    <Theme name={themeMode}>
      <StatusBar style={isLight ? "dark" : "light"} />
      <KeyboardSafeView
        style={{ flex: 1, backgroundColor: theme.surface.val }}
        keyboardVerticalOffset={60}
      >
        {/* Header — same rhythm as AppBar (safe area + 52pt, $3 gutters, Czen icons) */}
        <View
          paddingTop={insets.top}
          borderBottomWidth={1}
          borderBottomColor="$border"
          backgroundColor="$background"
        >
          <XStack height={52} alignItems="center" paddingHorizontal="$3" gap="$2">
            {onClose ? (
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ hội thoại"
                hitSlop={12}
                style={{
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon
                  name="chevron-down"
                  size={26}
                  color={theme.textPrimary.val}
                  pointerEvents="none"
                />
              </Pressable>
            ) : (
              <View width={40} />
            )}
            <YStack flex={1} justifyContent="center" gap={2}>
              <XStack alignItems="center" gap="$2">
                <AppText variant="h2" numberOfLines={1}>
                  Czen
                </AppText>
                <StatusChip voice={voice} lang={voiceLang} />
              </XStack>
              <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
                {headerCaption(voice, voiceLang)}
              </AppText>
            </YStack>
            {/* Balance the leading 40pt control — same as AppBar right slot */}
            <View width={40} />
          </XStack>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
            gap: 8,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {chats.length === 0 && (
            <YStack flex={1} alignItems="center" justifyContent="center" gap="$4" paddingVertical="$6">
              <View
                width={72}
                height={72}
                borderRadius={36}
                alignItems="center"
                justifyContent="center"
                backgroundColor="$primaryContainer"
              >
                <CzenMark size={40} color={theme.onPrimaryContainer.val} />
              </View>
              <YStack alignItems="center" gap="$1">
                <AppText variant="title">Nói với Czen</AppText>
                <AppText variant="body" color="$textSecondary" textAlign="center">
                  {voice.status === "connected"
                    ? "Czen đang nghe. Hỏi về chuyến, khách hay thu nhập."
                    : "Chạm nút Czen cạnh ô nhập rồi nói, hoặc chọn một gợi ý."}
                </AppText>
              </YStack>
              <SuggestionChips items={SUGGESTIONS[voiceLang]} onPick={sendText} align="center" />
            </YStack>
          )}
          {chats.map((chat, i) =>
            chat.who === "me" ? (
              <View
                key={i}
                maxWidth="80%"
                alignSelf="flex-end"
                borderRadius="$bubble"
                overflow="hidden"
                opacity={chat.streaming ? 0.78 : 1}
              >
                <LinearGradient
                  colors={CTA_GRADIENT}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ paddingHorizontal: 16, paddingVertical: 10 }}
                >
                  <AppText color={theme.textInverse.val}>{chat.msg}</AppText>
                </LinearGradient>
              </View>
            ) : chat.who === "customer" ? (
              <View
                key={i}
                maxWidth="80%"
                alignSelf="flex-start"
                backgroundColor={isLight ? "$warningContainer" : "$surfaceElevated"}
                borderRadius="$bubble"
                paddingHorizontal={16}
                paddingVertical={10}
                opacity={chat.streaming ? 0.78 : 1}
              >
                <AppText variant="caption" color="$textSecondary" marginBottom="$1">
                  Khách
                </AppText>
                <AppText variant="body" color="$textPrimary">{chat.msg}</AppText>
              </View>
            ) : (
              <View
                key={i}
                maxWidth="80%"
                alignSelf="flex-start"
                backgroundColor={isLight ? "$surfaceElevated" : "$accent"}
                borderRadius="$bubble"
                paddingHorizontal={16}
                paddingVertical={10}
                opacity={chat.streaming ? 0.78 : 1}
              >
                <AppText variant="body" color="$textPrimary">{chat.msg}</AppText>
              </View>
            ),
          )}
          {stubLoading && (
            <AppText variant="caption" color="$textSecondary">
              Đang trả lời...
            </AppText>
          )}
          {error && (
            <AppText variant="caption" color="$danger">
              {error}
            </AppText>
          )}
          {/* Quick replies stay under the greeting until the driver's first
              turn — the greeting used to arrive and wipe the chips just as
              they were most useful. */}
          {chats.length > 0 && !chats.some((c) => c.who === "me") && (
            <SuggestionChips items={SUGGESTIONS[voiceLang]} onPick={sendText} align="flex-start" />
          )}
        </ScrollView>

        <XStack
          alignItems="center"
          gap="$2"
          marginHorizontal="$5"
          marginBottom={insets.bottom + 12}
          paddingLeft="$2"
          paddingRight={6}
          height={56}
          borderRadius="$pill"
          backgroundColor="$surfaceElevated"
          borderWidth={StyleSheet.hairlineWidth}
          borderColor="$border"
        >
          <GlassSheen borderRadius={28} />
          <TouchableOpacity
            onPress={() => {
              if (voice.status !== "connected") return;
              voice.setMicMuted(!voice.isMicMuted);
            }}
            disabled={voice.status !== "connected"}
            accessibilityRole="button"
            accessibilityLabel={
              voice.isMicMuted ? "Bật micro" : "Tắt micro, giữ kết nối"
            }
            accessibilityState={{
              disabled: voice.status !== "connected",
              selected: voice.isMicMuted,
            }}
            hitSlop={4}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: voice.isMicMuted
                ? theme.dangerContainer.val
                : "transparent",
              opacity: voice.status === "connected" ? 1 : 0.35,
            }}
          >
            <Icon
              name={voice.isMicMuted ? "mic-off" : "mic"}
              size={20}
              color={
                voice.isMicMuted ? theme.danger.val : theme.textPrimary.val
              }
            />
          </TouchableOpacity>
          <TextInput
            value={msg}
            onChangeText={setMsg}
            onSubmitEditing={handleSend}
            editable={voice.status !== "connecting"}
            placeholder={
              voice.status === "connecting"
                ? "Đang kết nối..."
                : voice.status === "connected"
                  ? "Nói gì đó..."
                  : "Kết nối Trợ lý AI để chat..."
            }
            placeholderTextColor={theme.textMuted.val}
            selectionColor={isLight ? theme.primary.val : theme.secondary.val}
            style={{ flex: 1, color: theme.textPrimary.val, paddingLeft: 8, fontSize: 15 }}
          />
          {msg.trim() ? (
            <TouchableOpacity
              onPress={handleSend}
              disabled={voice.status === "connecting"}
              accessibilityRole="button"
              accessibilityLabel="Gửi tin nhắn"
              accessibilityState={{ disabled: voice.status === "connecting" }}
              hitSlop={6}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary.val,
                opacity: voice.status === "connecting" ? 0.5 : 1,
              }}
            >
              <Icon name="send" size={18} color={theme.textInverse.val} strokeWidth={2.1} />
            </TouchableOpacity>
          ) : (
            // Empty composer → the voice control lives here (connect / live
            // waveform / end) instead of a second floating orb under the bar.
            <ComposerVoiceButton />
          )}
        </XStack>
      </KeyboardSafeView>
    </Theme>
  );
}

function SuggestionChips({
  items,
  onPick,
  align,
}: {
  items: readonly string[];
  onPick: (text: string) => void;
  align: "center" | "flex-start";
}) {
  return (
    <XStack flexWrap="wrap" justifyContent={align} gap="$2" marginTop={align === "flex-start" ? "$2" : 0}>
      {items.map((s) => (
        <Pressable
          key={s}
          onPress={() => onPick(s)}
          accessibilityRole="button"
          accessibilityLabel={s}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <View
            paddingHorizontal="$3"
            paddingVertical="$2"
            borderRadius="$pill"
            backgroundColor="$chip"
            borderWidth={StyleSheet.hairlineWidth}
            borderColor="$border"
          >
            <AppText variant="label">{s}</AppText>
          </View>
        </Pressable>
      ))}
    </XStack>
  );
}
