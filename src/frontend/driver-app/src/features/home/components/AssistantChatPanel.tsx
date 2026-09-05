import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  TextInput,
  TouchableOpacity,
  Pressable,
  Keyboard,
} from "react-native";
import { View, XStack, Theme, useTheme } from "tamagui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSheen, CTA_GRADIENT } from "../../../components/LiquidGlass";
import { KeyboardSafeView } from "../../../components/KeyboardSafeView";
import { AppText } from "../../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useAssistantChatStore } from "../stores/assistantChatStore";
import { useVoiceSessionStore } from "../stores/voiceSessionStore";
import { useThemeStore } from "../../../stores/themeStore";
import { getAssistantReply } from "../../../services/api/assistant";

interface Props {
  onClose?: () => void;
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
        <XStack
          width="100%"
          paddingTop={insets.top}
          paddingHorizontal="$3"
          minHeight={44}
          alignItems="center"
          gap="$2"
        >
          <View flex={1} alignItems="center" justifyContent="center" minHeight={44}>
            {voice.status === "connected" && voice.isCallActive ? (
              <AppText variant="caption" textAlign="center" color="$textSecondary">
                Đang trong cuộc gọi — không thể tắt
              </AppText>
            ) : voice.status === "connected" && voice.isMicMuted ? (
              <AppText variant="caption" textAlign="center" color="$textSecondary">
                Mic đang tắt
              </AppText>
            ) : null}
          </View>
          {onClose ? (
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Thu nhỏ hội thoại"
              hitSlop={12}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.surfaceElevated.val,
                borderWidth: 1,
                borderColor: theme.border.val,
              }}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={theme.textSecondary.val}
                pointerEvents="none"
              />
            </Pressable>
          ) : null}
        </XStack>

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
                opacity={chat.streaming ? 0.78 : 1}
              >
                <AppText variant="body" color="$textPrimary">{chat.msg}</AppText>
              </View>
            ),
          )}
          {stubLoading && (
            <AppText variant="caption" color="$textSecondary" paddingHorizontal="$1">
              Đang trả lời...
            </AppText>
          )}
          {error && (
            <AppText variant="caption" color="$danger" paddingHorizontal="$1">
              {error}
            </AppText>
          )}
        </ScrollView>

        <XStack
          alignItems="center"
          gap="$2"
          marginHorizontal={20}
          // Overlay already stops above the floating tab bar + orb
          // (`MAP_OVERLAY_BOTTOM_CLEARANCE` on AssistantChatOverlay) — only
          // need a small gap above that cut line, not a second full clearance.
          marginBottom="$3"
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
            // Highlighted-text (select-all) color — was left at the OS
            // default (a generic blue), which clashed against this app's
            // purple-branded glass fields. Brighter in dark mode (#C084FC vs
            // #8B5CF6) since a highlight needs more contrast against a dark
            // field than a light one.
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
            <Ionicons
              name="send"
              size={18}
              color={isLight ? theme.textPrimary.val : theme.textInverse.val}
            />
          </TouchableOpacity>
        </XStack>
      </KeyboardSafeView>
    </Theme>
  );
}
