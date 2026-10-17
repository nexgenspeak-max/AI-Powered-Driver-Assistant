import { YStack, XStack, View, useTheme } from "tamagui";
import { Ionicons } from "@expo/vector-icons";
import { Surface } from "../../../components/Surface";
import { AppText } from "../../../components/AppText";
import { StatCard } from "../../../components/StatCard";
import { Badge } from "../../../components/Badge";
import { GlossyAvatar } from "./GlossyAvatar";
import { SectionTitle } from "./SectionTitle";
import type { Driver, DriverProfile } from "../../../types";

interface Props {
  driver: Driver;
  profile: DriverProfile;
}

export function ProfileCard({ driver, profile }: Props) {
  const isOnline = driver.status === "online";
  const theme = useTheme();

  return (
    <YStack gap="$4">
      {/* Identity card: avatar + name + phone on one row (Grab/Uber profile
          header), vehicle as a plate chip, status badge — one glance. */}
      <Surface clip borderRadius={24} padding="$4" gap="$4">
        <XStack alignItems="center" gap="$4">
          <GlossyAvatar letter={driver.name.charAt(0).toUpperCase()} size={64} />
          <YStack flex={1} gap={2} minWidth={0}>
            <AppText variant="h2" numberOfLines={1}>
              {driver.name}
            </AppText>
            <AppText variant="caption" color="$textSecondary" numberOfLines={1}>
              {driver.phone}
            </AppText>
            <View alignSelf="flex-start" marginTop={4}>
              <Badge
                label={isOnline ? "Đang nhận chuyến" : "Đang nghỉ"}
                backgroundColor={isOnline ? "$successContainer" : "$chip"}
                color={isOnline ? "$onSuccessContainer" : "$textSecondary"}
                glass={false}
                icon={
                  <Ionicons
                    name="ellipse"
                    size={7}
                    color={isOnline ? theme.success.val : theme.textMuted.val}
                  />
                }
              />
            </View>
          </YStack>
        </XStack>
        {!!driver.vehicle_name && (
          <XStack alignItems="center" gap="$3" paddingTop="$3" borderTopWidth={1} borderTopColor="$divider">
            <Ionicons name="car-outline" size={20} color={theme.textSecondary.val} />
            <AppText variant="body" flex={1} numberOfLines={1}>
              {driver.vehicle_name}
            </AppText>
            {!!driver.vehicle_plate && (
              <View paddingHorizontal={10} paddingVertical={4} borderRadius={8} borderWidth={1} borderColor="$borderStrong">
                <AppText variant="label" letterSpacing={0.5}>
                  {driver.vehicle_plate}
                </AppText>
              </View>
            )}
          </XStack>
        )}
      </Surface>

      <YStack gap="$3">
        <SectionTitle>Thống kê</SectionTitle>
        <XStack gap="$3">
          <StatCard label="Đánh giá" value={profile.rating.toFixed(2)} icon="star-outline" />
          <StatCard label="Tổng chuyến" value={String(profile.total_trips)} icon="bar-chart-outline" />
        </XStack>
        <XStack gap="$3">
          <StatCard
            label="Tỉ lệ nhận"
            value={`${profile.acceptance_rate.toFixed(0)}%`}
            icon="thumbs-up-outline"
          />
          <StatCard
            label="Tỉ lệ hoàn thành"
            value={`${profile.completion_rate.toFixed(0)}%`}
            icon="checkmark-circle-outline"
          />
        </XStack>
      </YStack>
    </YStack>
  );
}
