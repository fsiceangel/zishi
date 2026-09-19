# -*- coding: utf-8 -*-
"""
Subset LXGW WenKai GB (raw/fonts/LXGWWenKaiGB-Regular.ttf, OFL) to the characters
the site actually uses (all data JSON + every CJK char in src/) -> public/fonts/wenkai.woff2
"""
import json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
FONT = os.path.join(ROOT, "raw", "fonts", "LXGWWenKaiGB-Regular.ttf")
OUT = os.path.join(ROOT, "public", "fonts")
os.makedirs(OUT, exist_ok=True)

text = set()
for name in ("volumes.json", "chars.json", "poems.json", "words.json"):
    text.update(open(os.path.join(ROOT, "src", "data", name), encoding="utf-8").read())
for dirpath, _, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if f.endswith((".jsx", ".js", ".css")):
            text.update(open(os.path.join(dirpath, f), encoding="utf-8").read())
text.update(open(os.path.join(ROOT, "index.html"), encoding="utf-8").read())
# pinyin letters, digits, common punctuation
text.update("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ")
text.update("，。、；：？！“”‘’（）《》〈〉【】—…·～ ")
text.update(chr(c) for c in range(0x20, 0x7f))
cjk = [c for c in text if "㐀" <= c <= "鿿"]
chars = "".join(sorted(c for c in text if ord(c) >= 0x20 and c not in "\n\r\t"))
tmp = os.path.join(OUT, "_chars.txt")
open(tmp, "w", encoding="utf-8").write(chars)
subprocess.check_call([sys.executable, "-m", "fontTools.subset", FONT,
                       f"--text-file={tmp}", "--flavor=woff2", "--layout-features=*",
                       "--no-hinting", "--desubroutinize",
                       f"--output-file={os.path.join(OUT, 'wenkai.woff2')}"])
os.remove(tmp)
print(f"{len(cjk)} CJK chars, {len(chars)} glyphs -> {os.path.getsize(os.path.join(OUT, 'wenkai.woff2'))/1e6:.2f} MB")
