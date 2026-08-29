import { styled, View, useTheme } from "tamagui";
import { GlassSheen } from "./LiquidGlass";
import { AppText } from "./AppText";

const BadgeFrame = styled(View, {
  flexDirection: "row",
  alignItems: "center",
  gap: "$1",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: "$pill",
  alignSelf: "flex-start",
  overflow: "hidden",
});

interface Props {
  label: string;
  /** Tamagui color token or literal color, e.g. "$primaryMuted" or "rgba(255,255,255,0.08)". Defaults to a neutral theme-aware chip. */
  backgroundColor?: string;
  color?: string;
  /** Optional leading icon (e.g. a small status dot) rendered before the label. */
  icon?: React.ReactNode;
  /** Disable the overlay glass sheen for very small status chips. */
  glass?: boolean;
}

export function Badge({
  label,
  backgroundColor,
  color,
  icon,
  glass = true,
}: Props) {
  const theme = useTheme();

  return (
    <BadgeFrame backgroundColor={backgroundColor ?? theme.chip.val}>
      {/* $pill token is 999 — RN clamps borderRadius to the box's own
          half-height automatically, so this constant always matches
          BadgeFrame's clip without needing a measured layout height. */}
      {glass ? <GlassSheen borderRadius={999} /> : null}
      {icon}
      <AppText variant="caption" color={color ?? theme.onSurfaceVariant.val}>
        {label}
      </AppText>
    </BadgeFrame>
  );
}
