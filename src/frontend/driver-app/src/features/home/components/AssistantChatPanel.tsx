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
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAssistantChatStore } from "../stores/assistantChatStore";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import { useThemeStore } from "../../../stores/themeStore";
import { getAssistantReply } from "../../../services/api/assistant";
import { CHAT_ORB_CLEARANCE } from "./ChatVoiceDock";

const STATUS_CAPTION = {
  idle: "Chạm nút Trợ lý bên dưới để kết nối",
  connecting: "Đang kết nối với Czen…",
  connected: "Đã kết nối với Czen — chạm nút Trợ lý để ngắt",
  error: "Kết nối lỗi — chạm nút Trợ lý để thử lại",
} as const;

interface Props {
  onClose?: () => void;
}

function headerCaption(voice: {
  status: "idle" | "connecting" | "connected" | "error";
  isCallActive: boolean;
  isMicMuted: boolean;
}): string {
  if (voice.status === "connected" && voice.isCallActive) {
    return "Đang trong cuộc gọi — không thể tắt";
  }
  if (voice.status === "connected" && voice.isMicMuted) {
    return "Mic đang tắt — phiên vẫn kết nối";
  }
  return STATUS_CAPTION[voice.status];
}

export function AssistantChatPanel({ onClose }: Props = {}) {
  const themeMode = useThemeStore((s) => s.mode);
  const isLight = themeMode === "light";
  const theme = useTheme();
  const { chats, addUserMessage, addBotMessage, upsertStreamingMessage } =
    useAssistantChatStore();
  const voice = useVoiceSessionStore();
  const [msg, setMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [stubLoading, setStubLoading] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [chats]);

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
        {/* Header — same rhythm as AppBar (safe area + 52pt, $3 gutters, Ionicons) */}
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
                <Ionicons
                  name="chevron-down"
                  size={26}
                  color={theme.textPrimary.val}
                  pointerEvents="none"
                />
              </Pressable>
            ) : (
              <View width={40} />
            )}
            <YStack flex={1} justifyContent="center" gap="$1">
              <AppText variant="h2" numberOfLines={1}>
                Trợ lý Czen
              </AppText>
              <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
                {headerCaption(voice)}
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
        </ScrollView>

        <XStack
          alignItems="center"
          gap="$2"
          marginHorizontal="$5"
          marginBottom={insets.bottom + CHAT_ORB_CLEARANCE}
          paddingHorizontal="$2"
          height={48}
          borderRadius="$pill"
          backgroundColor="$surfaceElevated"
          borderWidth={StyleSheet.hairlineWidth}
          borderColor="$border"
        >
          <GlassSheen borderRadius={24} />
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
            <Ionicons
              name={voice.isMicMuted ? "mic-off" : "mic-outline"}
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
          <TouchableOpacity
            onPress={handleSend}
            disabled={voice.status === "connecting"}
            accessibilityRole="button"
            accessibilityLabel="Gửi tin nhắn"
            accessibilityState={{ disabled: voice.status === "connecting" }}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: voice.status === "connecting" ? 0.35 : 1,
            }}
          >
            <Ionicons name="send" size={18} color={theme.textPrimary.val} />
          </TouchableOpacity>
        </XStack>
      </KeyboardSafeView>
    </Theme>
  );
}
