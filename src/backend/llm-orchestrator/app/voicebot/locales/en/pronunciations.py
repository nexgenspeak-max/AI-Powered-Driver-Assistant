"""
English TTS pronunciation corrections.

Each entry is (pattern, replacement) applied to agent speech before synthesis.
"""

PRONUNCIATIONS: list[tuple[str, str]] = [
    # Acronyms that TTS may slur together
    ("ETA",  "E T A"),
    ("SMS",  "S M S"),
    ("AI",   "A I"),
    ("SIP",  "S I P"),

    # Unit expansions
    ("km",  "kilometers"),
    ("KM",  "kilometers"),
    ("min", "minutes"),
]
