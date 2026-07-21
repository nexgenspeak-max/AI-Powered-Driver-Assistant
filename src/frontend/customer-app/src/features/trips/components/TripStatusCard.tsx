import { ScrollView, StyleSheet } from "react-native";
import { View, YStack, XStack, Text, useTheme, useThemeName } from "tamagui";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassSurface } from "../../../components/GlassSurface";
import { Badge } from "../../../components/Badge";
import { getBackButtonClearance } from "../../../components/BackButton";
import {
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
} from "../../../constants/status";
import type { Trip } from "../../../types";

export function TripStatusCard({ trip }: { trip: Trip }) {
  const themeName = useThemeName();
  const isLight = themeName === "light";
  const statusColor = TRIP_STATUS_COLORS[trip.status];
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[
        styles.screen,
        { backgroundColor: isLight ? "#F5F4F8" : "#110D1B" },
      ]}
      contentContainerStyle={{
        padding: 10,
        paddingTop: getBackButtonClearance(insets.top) + 16,
        paddingBottom: 100,
        gap: 20,
      }}
    >
      <View style={styles.glowContainer} pointerEvents="none">
        <Svg width="100%" height={360} style={styles.glowSvg}>
          <Defs>
            <RadialGradient
              id="ambientGlow"
              cx="20%"
              cy="25%"
              rx="45%"
              ry="45%"
            >
              <Stop
                offset="0%"
                stopColor={isLight ? "#FFFFFF" : "#FFFFFF"}
                stopOpacity={isLight ? 0.08 : 0.06}
              />
              <Stop
                offset="100%"
                stopColor={isLight ? "#FFFFFF" : "#FFFFFF"}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#ambientGlow)" />
        </Svg>
      </View>

      <View marginLeft={20}>
        <Text
          fontSize={22}
          fontWeight="800"
          color={isLight ? "#111827" : "#FFFFFF"}
        >
          Trip Status
        </Text>
        <Text
          fontFamily="$mono"
          fontSize={12}
          color={isLight ? "#6B7280" : "#B3B3C1"}
          marginTop={6}
        >
          #{trip.trip_id}
        </Text>
      </View>

      <GlassSurface
        style={{
          padding: 24,
          paddingLeft: 20,
          borderRadius: 32,
          backgroundColor: isLight
            ? "rgba(255,255,255,0.78)"
            : "rgba(21,16,32,0.78)",
        }}
        cornerRadius={32}
        topShadowAlpha={0}
        bottomHighlightAlpha={0.4}
      >
        <YStack gap="$3" marginLeft={20} marginBottom={20} marginTop={20}>
          <Badge
            label={TRIP_STATUS_LABELS[trip.status]}
           
            backgroundColor={statusColor.bg}
            color={statusColor.text}
            glass={false}
          />

          <YStack gap="$3">
            <View>
              <Text
                fontSize={10}
                color={isLight ? "#6B7280" : "#A0A0B5"}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                Pickup
              </Text>
              <Text
                fontSize={16}
                fontWeight="700"
                color={isLight ? "#111827" : "#FFFFFF"}
                marginTop={4}
              >
                {trip.pickup_address}
              </Text>
            </View>

            <View>
              <Text
                fontSize={10}
                color={isLight ? "#6B7280" : "#A0A0B5"}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                Dropoff
              </Text>
              <Text
                fontSize={16}
                fontWeight="700"
                color={isLight ? "#111827" : "#FFFFFF"}
                marginTop={4}
              >
                {trip.dropoff_address}
              </Text>
            </View>

            <View>
              <Text
                fontSize={10}
                color={isLight ? "#6B7280" : "#A0A0B5"}
                textTransform="uppercase"
                letterSpacing={0.8}
              >
                Driver
              </Text>
              <Text
                fontSize={16}
                fontWeight="700"
                color={isLight ? "#111827" : "#FFFFFF"}
                marginTop={4}
              >
                {trip.driver_phone}
              </Text>
            </View>
          </YStack>
        </YStack>
      </GlassSurface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  glowContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 360,
  },
  glowSvg: {
    opacity: 0.75,
  },
});
