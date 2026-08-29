"""
Vietnamese TTS pronunciation — display text stays as-is; `SpeechTextFixMixin.tts_node`
transforms a copy right before synthesis.

Sections:
  PRONUNCIATIONS       — whole-word replacements (word boundaries)
  ABBREVIATION_PATTERNS — regex for VN abbreviations (Q1, TP.HCM, …)
"""
from __future__ import annotations

PRONUNCIATIONS: list[tuple[str, str]] = [
    # Standalone digits → Vietnamese words (phone digits already comma-spelled).
    ("0", "không"),
    ("1", "một"),
    ("2", "hai"),
    ("3", "ba"),
    ("4", "bốn"),
    ("5", "năm"),
    ("6", "sáu"),
    ("7", "bảy"),
    ("8", "tám"),
    ("9", "chín"),

    # Units
    ("km", "cây số"),
    ("KM", "cây số"),
    ("km/h", "cây số trên giờ"),

    # English acronyms
    ("ETA", "ê tê a"),
    ("SMS", "ét em ét"),
    ("AI", "ây ai"),
    ("SIP", "síp"),
    ("GPS", "gi pi ét"),
    ("APP", "ép"),
]

# Regex → spoken form. Longer / more specific patterns first.
ABBREVIATION_PATTERNS: list[tuple[str, str]] = [
    (r"\bTP\.?\s*HCM\b", "thành phố Hồ Chí Minh"),
    (r"\bTP\.?\s*HN\b", "thành phố Hà Nội"),
    (r"\bHCM\b", "Hồ Chí Minh"),
    (r"\bHN\b", "Hà Nội"),
    (r"\bSG\b", "Sài Gòn"),
    (r"\bQ\.?\s*(\d+)\b", r"quận \1"),
    (r"\bP\.?\s*(\d+)\b", r"phường \1"),
    (r"\bQu\.?\s*(\d+)\b", r"quận \1"),
    # Shorthand money: 150k, 2tr, 1.5tr
    (r"\b(\d+(?:[.,]\d+)?)\s*k\b", r"\1 nghìn"),
    (r"\b(\d+(?:[.,]\d+)?)\s*tr\b", r"\1 triệu"),
    (r"\b(\d+(?:[.,]\d+)?)\s*tỷ\b", r"\1 tỷ"),
    (r"\bVNĐ\b", "đồng"),
    (r"\bVND\b", "đồng"),
]
