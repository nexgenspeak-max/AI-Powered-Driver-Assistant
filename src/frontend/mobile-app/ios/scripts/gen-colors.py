#!/usr/bin/env python3
"""Generate asset-catalog colour sets from the parity-map palette (light / dark)."""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "CzenDriver", "Resources", "Assets.xcassets", "Palette")

# name: (light, dark) — hex "#RRGGBB" or "rgba(r,g,b,a)" or "#RRGGBBAA"
PALETTE = {
    "Background": ("#F4F6FB", "#1A1420"),
    "Surface": ("#F4F6FB", "#1A1420"),
    "SurfaceElevated": ("#FFFFFF", "#241D2C"),
    "SurfaceHigh": ("#FFFFFF", "#2E2438"),
    "SurfaceVariant": ("#EEE9F3", "#2E2438"),
    "OnSurfaceVariant": ("#5B5566", "#B7B2C0"),
    "TextPrimary": ("#111827", "#F5F5F7"),
    "TextSecondary": ("#4B5563", "#A1A1A6"),
    "TextMuted": ("#6B7280", "#6E6E73"),
    "Border": ("#E5E7EB", "rgba(255,255,255,0.06)"),
    "BorderStrong": ("#D1D5DB", "rgba(255,255,255,0.14)"),
    "Outline": ("#D9D2E3", "rgba(255,255,255,0.16)"),
    "OutlineVariant": ("#EDE8F2", "rgba(255,255,255,0.06)"),
    "Divider": ("rgba(17,24,39,0.08)", "rgba(255,255,255,0.06)"),
    "InputBorder": ("#D9D2E3", "rgba(255,255,255,0.14)"),
    "PrimaryContainer": ("#EDE9FE", "#2E2250"),
    "OnPrimaryContainer": ("#4C1D95", "#DDD6FE"),
    "ChipSelected": ("#EDE9FE", "rgba(139,92,246,0.24)"),
    "Secondary": ("#A855F7", "#C084FC"),
    "SecondaryContainer": ("#F3E8FF", "#3B2A52"),
    "OnSecondaryContainer": ("#5B21B6", "#EAD9FB"),
    "Success": ("#16A34A", "#34D399"),
    "SuccessContainer": ("#DCFCE7", "rgba(52,211,153,0.16)"),
    "OnSuccessContainer": ("#14532D", "#6EE7B7"),
    "Warning": ("#F59E0B", "#FBBF24"),
    "WarningContainer": ("#FEF3C7", "rgba(251,191,36,0.16)"),
    "OnWarningContainer": ("#78350F", "#FCD34D"),
    "Danger": ("#EF4444", "#F87171"),
    "DangerContainer": ("#FEE2E2", "rgba(248,113,113,0.16)"),
    "OnDangerContainer": ("#7F1D1D", "#FCA5A5"),
    "Info": ("#3B82F6", "#60A5FA"),
    "InfoContainer": ("#DBEAFE", "rgba(96,165,250,0.16)"),
    "OnInfoContainer": ("#1E3A8A", "#93C5FD"),
    "DisabledBackground": ("rgba(17,24,39,0.08)", "rgba(255,255,255,0.08)"),
    "DisabledText": ("rgba(17,24,39,0.38)", "rgba(255,255,255,0.38)"),
    "Pressed": ("rgba(139,92,246,0.12)", "rgba(139,92,246,0.20)"),
    "PrimaryMuted": ("rgba(139,92,246,0.16)", "rgba(139,92,246,0.16)"),
    "OnSuccessButton": ("#FFFFFF", "#111827"),
    # chat bubbles
    "BubbleBot": ("#FFFFFF", "#232325"),
    "BubbleCustomer": ("#FEF3C7", "#241D2C"),
    # offer ring track
    "RingTrack": ("#EDE9FE", "#2E2250"),
    # auth screens
    "AuthTop": ("#EDE9FE", "#2A1B4D"),
    "AuthMid": ("#F5F4F8", "#1A1420"),
    "AuthBottom": ("#F5F4F8", "#121212"),
    "AuthCard": ("rgba(255,255,255,0.94)", "#2A2438"),
    "AuthField": ("rgba(255,255,255,0.55)", "rgba(255,255,255,0.05)"),
    "AuthFieldRing": ("#D1D5DB", "rgba(255,255,255,0.08)"),
    "AuthTitle": ("#000000", "#FFFFFF"),
    # status badge scales (Radix step 4 bg / step 11 text)
    "BadgeYellowBg": ("#FFF7C2", "#302008"), "BadgeYellowFg": ("#9E6C00", "#F5E147"),
    "BadgeBlueBg": ("#E6F4FE", "#003362"), "BadgeBlueFg": ("#0D74CE", "#70B8FF"),
    "BadgePurpleBg": ("#F2E2FC", "#301C3B"), "BadgePurpleFg": ("#8145B5", "#D19DFF"),
    "BadgeGreenBg": ("#D6F1DF", "#132D21"), "BadgeGreenFg": ("#218358", "#3DD68C"),
    "BadgeRedBg": ("#FFDBDC", "#500F1C"), "BadgeRedFg": ("#CE2C31", "#FF9592"),
    "BadgeOrangeBg": ("#FFDFB5", "#331E0B"), "BadgeOrangeFg": ("#CC4E00", "#FFA057"),
    "BadgePinkBg": ("#FCE5F3", "#4B143D"), "BadgePinkFg": ("#C2298A", "#FF8DCC"),
    "BadgeGrayBg": ("#E8E8E8", "#2A2A2A"), "BadgeGrayFg": ("#646464", "#B4B4B4"),
}


def comps(value: str) -> dict:
    v = value.strip()
    if v.startswith("rgba"):
        r, g, b, a = [x.strip() for x in v[v.index("(") + 1 : v.index(")")].split(",")]
        return {"red": f"{int(r)/255:.3f}", "green": f"{int(g)/255:.3f}", "blue": f"{int(b)/255:.3f}", "alpha": f"{float(a):.3f}"}
    h = v.lstrip("#")
    a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
    return {"red": f"0x{h[0:2]}", "green": f"0x{h[2:4]}", "blue": f"0x{h[4:6]}", "alpha": f"{a:.3f}"}


def colorset(light: str, dark: str) -> dict:
    return {
        "colors": [
            {"idiom": "universal", "color": {"color-space": "srgb", "components": comps(light)}},
            {
                "idiom": "universal",
                "appearances": [{"appearance": "luminosity", "value": "dark"}],
                "color": {"color-space": "srgb", "components": comps(dark)},
            },
        ],
        "info": {"author": "xcode", "version": 1},
    }


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "Contents.json"), "w") as fh:
        json.dump({"info": {"author": "xcode", "version": 1}, "properties": {"provides-namespace": False}}, fh, indent=2)
    for name, (light, dark) in PALETTE.items():
        d = os.path.join(OUT, f"{name}.colorset")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "Contents.json"), "w") as fh:
            json.dump(colorset(light, dark), fh, indent=2)
    base = os.path.dirname(OUT)
    for name, (light, dark) in {"AccentColor": ("#8B5CF6", "#8B5CF6"), "LaunchBackground": ("#1A1420", "#1A1420")}.items():
        d = os.path.join(base, f"{name}.colorset")
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "Contents.json"), "w") as fh:
            json.dump(colorset(light, dark), fh, indent=2)
    with open(os.path.join(base, "Contents.json"), "w") as fh:
        json.dump({"info": {"author": "xcode", "version": 1}}, fh, indent=2)
    print(f"{len(PALETTE)} palette colours written")


if __name__ == "__main__":
    main()
