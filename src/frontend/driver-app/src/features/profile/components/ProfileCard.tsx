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
      <Surface clip alignItems="center" gap="$2" paddingVertical="$5" borderRadius={24}>
        <GlossyAvatar letter={driver.name.charAt(0).toUpperCase()} size={96} />
        <AppText variant="h1" marginTop="$2">
          {driver.name}
        </AppText>
        <View>
          <Badge
            label={isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
            backgroundColor={isOnline ? "$successContainer" : "$primaryMuted"}
            color={isOnline ? "$onSuccessContainer" : "$textPrimary"}
            icon={
              <Ionicons
                name="ellipse"
                size={7}
                color={isOnline ? theme.success.val : theme.primary.val}
              />
            }
          />
        </View>
      </Surface>

      <Surface clip borderRadius={24}>
        <SectionTitle>Thông tin liên hệ</SectionTitle>
        <InfoRow icon="call-outline" label="Số điện thoại" value={driver.phone} />
        {!!driver.vehicle_name && (
          <>
            <Divider />
            <InfoRow
              icon="car-outline"
              label="Phương tiện"
              value={`${driver.vehicle_name} · ${driver.vehicle_plate}`}
            />
          </>
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

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const theme = useTheme();
  return (
    <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingVertical="$4">
      <View width={24} alignItems="center">
        <Ionicons name={icon} size={20} color={theme.textSecondary.val} />
      </View>
      <YStack flex={1}>
        <AppText variant="caption" color="$textSecondary">
          {label}
        </AppText>
        <AppText variant="body">{value}</AppText>
      </YStack>
    </XStack>
  );
}

function Divider() {
  return <View height={1} backgroundColor="$border" alignSelf="stretch" />;
}
