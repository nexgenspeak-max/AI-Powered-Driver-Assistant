#!/usr/bin/env python3
"""Build Resources/Localizable.xcstrings (source language vi) from user-facing literals.

Vietnamese is the development language, so every key is its own vi value. Re-run after adding
copy; Xcode also keeps the catalog in sync when built from the IDE.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "CzenDriver")
OUT = os.path.join(SRC, "Resources", "Localizable.xcstrings")
CALL = re.compile(r'(?:Text|Button|Label|Toggle|CzenButton\(title:|\.navigationTitle|\.alert|\.confirmationDialog|title:|message:|subtitle:|label:|placeholder:|EmptyStateView\(systemImage: "[^"]+", title:)\s*\(?\s*"((?:[^"\\]|\\.)+)"')
VI = re.compile(r"[À-ỹĐđ]|\s")

keys = set()
for dirpath, _, files in os.walk(SRC):
    for f in files:
        if not f.endswith(".swift"):
            continue
        text = open(os.path.join(dirpath, f), encoding="utf-8").read()
        for m in CALL.finditer(text):
            s = m.group(1)
            if "\\(" in s or not VI.search(s) or len(s) < 2:
                continue
            keys.add(s.replace('\\"', '"'))

catalog = {"sourceLanguage": "vi", "version": "1.0", "strings": {}}
for k in sorted(keys):
    catalog["strings"][k] = {"extractionState": "manual", "localizations": {"vi": {"stringUnit": {"state": "translated", "value": k}}}}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(catalog, fh, ensure_ascii=False, indent=2)
print(f"{len(keys)} strings")
