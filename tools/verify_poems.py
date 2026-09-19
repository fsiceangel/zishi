# -*- coding: utf-8 -*-
"""
Check every poem line in tools/poems.json against the textbook text dumps
(raw/txt/<book>.txt): all CJK characters of a line must appear, in order and
contiguous, somewhere in the book (whitespace/pinyin/punctuation ignored).
Also resolves each poem to its TOC entry (lesson or 语文园地) by printed page.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = os.path.join(HERE, "..", "raw", "txt")
poems = json.load(open(os.path.join(HERE, "poems.json"), encoding="utf-8"))
toc = json.load(open(os.path.join(HERE, "out", "toc.json"), encoding="utf-8"))

CJK = re.compile(r"[㐀-鿿]")
books = {}
for code in sorted({p["book"] for p in poems}):
    raw = open(os.path.join(TXT, f"{code}.txt"), encoding="utf-8").read()
    books[code] = "".join(CJK.findall(raw))


def locate(code, page):
    """TOC entry (lesson/special) whose page range contains `page`."""
    entries = [e for e in toc[code] if e["kind"] in ("lesson", "special", "songdu") and e["page"]]
    best = None
    for e in entries:
        if e["page"] <= page and (best is None or e["page"] >= best["page"]):
            best = e
    return best


# characters the PDF text layer does not carry (drawn as outlines): line is verified without them
EXCEPT = {("5a", "蝉"): {"緌"}}

bad = 0
for p in poems:
    text = books[p["book"]]
    misses = []
    for line in p["lines"]:
        key = "".join(c for c in CJK.findall(line) if c not in EXCEPT.get((p["book"], p["title"]), ()))
        if key and key not in text:
            misses.append(line)
    if p.get("preface"):
        key = "".join(CJK.findall(p["preface"]))
        if key not in text:
            misses.append("[preface] " + p["preface"])
    if "page" not in p and "lesson" in p:
        les = [e for e in toc[p["book"]] if e["kind"] == "lesson" and e["num"] == p["lesson"]]
        p["page"] = les[0]["page"] if les else None
    ent = locate(p["book"], p["page"]) if p.get("page") else None
    where = f'{ent["kind"]}:{ent["num"] or ""}{ent["title"]}' if ent else "??"
    flag = "OK " if not misses else "XX "
    if misses:
        bad += 1
    print(f'{flag}{p["book"]} p{p["page"]:<4} {p["title"]:<14} -> {where}' + (f'   MISSING {misses}' if misses else ""))
print(f"\n{len(poems)} poems, {bad} with unmatched lines")
sys.exit(1 if bad else 0)
