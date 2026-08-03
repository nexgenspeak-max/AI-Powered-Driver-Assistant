"""
Vietnamese TTS pronunciation corrections.

Each entry is (pattern, replacement) where pattern is a plain string or
regex that the TTS pre-processor will substitute before synthesis.
Apply these to agent speech output before sending to the TTS provider.
"""

PRONUNCIATIONS: list[tuple[str, str]] = [
    # Digits 0-9, spoken individually. speech_text_fix.py spells phone
    # numbers out one digit at a time, comma-joined (e.g. "0, 9, 1, 2, ...").
    # Mapping each bare digit to its Vietnamese word (rather than leaving the
    # numeral for the TTS to read) avoids ElevenLabs occasionally misreading
    # or slurring an isolated numeral. Only matches a standalone digit
    # (word-boundary on both sides), so multi-digit runs like grouped prices
    # ("250 000") are unaffected.
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

    # Unit abbreviations → full Vietnamese words
    ("km",   "cây số"),
    ("KM",   "cây số"),
    ("phút", "phút"),    # already correct, included as no-op anchor

    # English acronyms that TTS often mispronounces
    ("ETA",  "ê tê a"),
    ("SMS",  "ét em ét"),
    ("AI",   "ây ai"),
    ("SIP",  "síp"),

    # Number formatting edge cases handled elsewhere; listed for reference
    # ("0",  "không"),  # only in specific contexts — apply with regex if needed
]
