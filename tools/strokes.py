# -*- coding: utf-8 -*-
"""
Copy Hanzi Writer stroke data (node_modules/hanzi-writer-data, Make Me a Hanzi /
Arphic PL) for every character in src/data/chars.json into public/strokes/<hex>.json,
so the site serves stroke animations and writing quizzes without a CDN.
"""
import json, os, shutil

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
SRC = os.path.join(ROOT, "node_modules", "hanzi-writer-data")
DST = os.path.join(ROOT, "public", "strokes")
os.makedirs(DST, exist_ok=True)

chars = json.load(open(os.path.join(ROOT, "src", "data", "chars.json"), encoding="utf-8"))
missing = []
n = 0
for c in chars:
    src = os.path.join(SRC, f"{c}.json")
    if not os.path.exists(src):
        missing.append(c); continue
    shutil.copyfile(src, os.path.join(DST, f"{ord(c):x}.json"))
    n += 1
json.dump(missing, open(os.path.join(DST, "_missing.json"), "w", encoding="utf-8"), ensure_ascii=False)
size = sum(os.path.getsize(os.path.join(DST, f)) for f in os.listdir(DST))
print(f"copied {n} stroke files ({size/1e6:.1f} MB), missing {len(missing)}: {''.join(missing)}")
