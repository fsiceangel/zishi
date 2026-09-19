# -*- coding: utf-8 -*-
"""
Ground-truth pinyin for poem characters, read off the textbook pages themselves
(the books print pinyin above new/hard characters; grades 1-2 annotate every
character).  Output: tools/out/poem_pinyin_pdf.json  ->  { "<book>:<page>": [[char, pinyin], ...] }
"""
import fitz, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_tables import decode_py, CJK

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "raw")
OFFSET = 5   # printed page -> pdf page index+1, same for all 12 books

poems = json.load(open(os.path.join(HERE, "poems.json"), encoding="utf-8"))
toc = json.load(open(os.path.join(HERE, "out", "toc.json"), encoding="utf-8"))


def page_pairs(page):
    chars, pys = [], []
    rd = page.get_text("rawdict")
    for block in rd["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                font, size = span["font"], span["size"]
                if "CenturyGothic" in font or size > 40:
                    continue
                if font == "HanyuXi-JZ":
                    buf = []
                    for ch in span["chars"] + [{"c": " ", "bbox": None}]:
                        if ch["c"].strip():
                            buf.append(ch)
                        elif buf:
                            x0 = min(b["bbox"][0] for b in buf); x1 = max(b["bbox"][2] for b in buf)
                            y0 = min(b["bbox"][1] for b in buf); y1 = max(b["bbox"][3] for b in buf)
                            tok = "".join(b["c"] for b in buf)
                            try:
                                pys.append((decode_py(tok), (x0, y0, x1, y1)))
                            except ValueError:
                                pass
                            buf = []
                    continue
                for ch in span["chars"]:
                    if CJK.match(ch["c"]) and 8 <= size <= 30:
                        chars.append((ch["c"], ch["bbox"]))
    pairs = []
    used = set()
    for c, (x0, y0, x1, y1) in chars:
        cx = (x0 + x1) / 2; w = x1 - x0
        best = None
        for j, (py, (px0, py0, px1, py1)) in enumerate(pys):
            if j in used:
                continue
            pcx = (px0 + px1) / 2
            dy = y0 - py1
            if abs(pcx - cx) < max(6, w * 0.6) and -4 < dy < max(8, w * 0.6):
                d = abs(pcx - cx) + abs(dy)
                if best is None or d < best[0]:
                    best = (d, j)
        if best:
            used.add(best[1]); pairs.append([c, pys[best[1]][0]])
    return pairs


def main():
    out = {}
    docs = {}
    for p in poems:
        if "page" not in p:
            les = [e for e in toc[p["book"]] if e["kind"] == "lesson" and e["num"] == p["lesson"]]
            p["page"] = les[0]["page"]
        for pg in (p["page"], p["page"] + 1):
            key = f'{p["book"]}:{pg}'
            if key in out:
                continue
            doc = docs.setdefault(p["book"], fitz.open(os.path.join(RAW, f'{p["book"]}.pdf')))
            out[key] = page_pairs(doc[pg + OFFSET - 1])
    json.dump(out, open(os.path.join(HERE, "out", "poem_pinyin_pdf.json"), "w", encoding="utf-8"), ensure_ascii=False)
    n = sum(len(v) for v in out.values())
    print(f"{len(out)} pages, {n} char-pinyin pairs")
    # peek
    print("1a:16", out.get("1a:16")[:12])
    print("3a:14", out.get("3a:14")[:12])


if __name__ == "__main__":
    main()
