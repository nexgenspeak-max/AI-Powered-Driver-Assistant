import { styled, Text, View, useTheme } from "tamagui";
import { GlassSheen } from "./LiquidGlass";

const BadgeFrame = styled(View, {
  flexDirection: "row",
  alignItems: "center",
  gap: "$1",
  paddingHorizontal: 10,
  paddingVertical: 4,
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
  /** Disable the decorative glass sheen for compact status chips inside a larger glass card. */
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
      <Text
        fontSize={11}
        fontWeight="600"
        color={color ?? theme.onSurfaceVariant.val}
      >
        {label}
      </Text>
    </BadgeFrame>
  );
}
