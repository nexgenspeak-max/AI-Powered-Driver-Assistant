"""
Vietnamese TTS pronunciation corrections.

Each entry is (pattern, replacement) where pattern is a plain string or
regex that the TTS pre-processor will substitute before synthesis.
Apply these to agent speech output before sending to the TTS provider.
"""

PRONUNCIATIONS: list[tuple[str, str]] = [
    # Unit abbreviations → full Vietnamese words
    ("km",   "cây số"),
    ("KM",   "cây số"),
    ("phút", "phút"),    # already correct, included as no-op anchor

    # English acronyms that TTS often mispronounces
    ("ETA",  "ê tê a"),
    ("SMS",  "ét em ét"),
    ("AI",   "a i"),
    ("SIP",  "síp"),

    # Number formatting edge cases handled elsewhere; listed for reference
    # ("0",  "không"),  # only in specific contexts — apply with regex if needed
]
