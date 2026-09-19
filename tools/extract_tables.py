# -*- coding: utf-8 -*-
"""
Extract 识字表 / 写字表 / 词语表 from the 12 部编版 textbook PDFs (raw/*.pdf).

Output: tools/out/tables.json
  { "1a": { "shizi": [group...], "xiezi": [group...], "words": [group...],
            "totals": {"shizi": 300, "xiezi": 100} }, ... }
  group = { "section": "识字"|"课文"|"汉语拼音"|"园地", "num": 3 | null, "label": "语文园地一" | null,
            "page": 120, "chars": [ {"c": "天", "py": "tiān", "blue": false} ... ] }

The tables are laid out geometrically (columns, multi-lesson rows, pinyin above
each character), so we walk characters by position instead of trusting the
content-stream order.
"""
import fitz, re, json, os, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "raw")
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

BOOKS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b", "5a", "5b", "6a", "6b"]

# HanyuXi-JZ pinyin font: tone-marked vowels are encoded as capital letters.
PY_MAP = {
    "Q": "ā", "W": "á", "A": "ǎ", "S": "à",
    "E": "ē", "R": "é", "D": "ě", "F": "è",
    "U": "ī", "I": "í", "J": "ǐ", "K": "ì",
    "T": "ō", "Y": "ó", "G": "ǒ", "H": "ò",
    "O": "ū", "P": "ú", "L": "ǔ", "M": "ù",
    "Z": "ǖ", "X": "ǘ", "V": "ǚ", "C": "ǜ", "B": "ǘ",
}
SYLLABLE = re.compile(r"^[a-zü]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouü][a-zü]*$")

CJK = re.compile(r"[㐀-鿿]")
BLUE = 0x00AEEF
ORANGE = {0xF5841F, 0xF5821F}


def decode_py(tok):
    out = "".join(PY_MAP.get(ch, ch) for ch in tok)
    if not SYLLABLE.match(out) and out not in ("hng", "hm", "ng", "m", "n"):
        raise ValueError(f"bad pinyin token {tok!r} -> {out!r}")
    return out


def page_items(page):
    """Classify every glyph on the page into chars / digit labels / pinyin / headers."""
    items = []
    rd = page.get_text("rawdict")
    for block in rd["blocks"]:
        if block["type"] != 0:
            continue
        for line in block["lines"]:
            for span in line["spans"]:
                font, size, color = span["font"], span["size"], span["color"]
                chars = span["chars"]
                text = "".join(ch["c"] for ch in chars)
                if "CenturyGothic" in font or size > 30:      # page numbers, 统编版 watermark
                    continue
                if font == "HanyuXi-JZ":
                    # one span may hold several syllables separated by spaces
                    buf = []
                    for ch in chars + [{"c": " ", "bbox": None}]:
                        if ch["c"].strip():
                            buf.append(ch)
                        elif buf:
                            x0 = min(b["bbox"][0] for b in buf); x1 = max(b["bbox"][2] for b in buf)
                            y0 = min(b["bbox"][1] for b in buf); y1 = max(b["bbox"][3] for b in buf)
                            items.append({"kind": "py", "text": "".join(b["c"] for b in buf),
                                          "bbox": (x0, y0, x1, y1)})
                            buf = []
                    continue
                stripped = text.strip()
                if size <= 13:
                    if stripped.startswith("语文园地"):
                        items.append({"kind": "garden", "text": stripped, "bbox": tuple(span["bbox"])})
                    m = re.search(r"共\s*(\d+)\s*个", stripped)
                    if m:
                        items.append({"kind": "total", "n": int(m.group(1)), "bbox": tuple(span["bbox"])})
                    continue
                if font.startswith("FZS3") and stripped in ("识字", "课文", "汉语拼音"):
                    items.append({"kind": "section", "text": stripped, "bbox": tuple(span["bbox"])})
                    continue
                # Kai-font body: digits (lesson numbers) and characters, possibly mixed in one span
                digits = []
                for ch in chars + [{"c": " ", "bbox": None}]:
                    c = ch["c"]
                    if c.isdigit():
                        digits.append(ch)
                        continue
                    if digits:
                        x0 = min(b["bbox"][0] for b in digits); x1 = max(b["bbox"][2] for b in digits)
                        y0 = min(b["bbox"][1] for b in digits); y1 = max(b["bbox"][3] for b in digits)
                        items.append({"kind": "digit", "n": int("".join(b["c"] for b in digits)),
                                      "bbox": (x0, y0, x1, y1)})
                        digits = []
                    if CJK.match(c) and 14 <= size <= 20:
                        items.append({"kind": "char", "text": c, "bbox": tuple(ch["bbox"]),
                                      "blue": color == BLUE, "color": color, "font": font})
    return items


def attach_pinyin(items):
    pys = [it for it in items if it["kind"] == "py"]
    used = set()
    for it in items:
        if it["kind"] != "char":
            continue
        x0, y0, x1, y1 = it["bbox"]
        cx = (x0 + x1) / 2
        best = None
        for j, p in enumerate(pys):
            if j in used:
                continue
            px0, py0, px1, py1 = p["bbox"]
            pcx = (px0 + px1) / 2
            dy = y0 - py1
            if abs(pcx - cx) < 9 and -4 < dy < 9:
                d = abs(pcx - cx) + abs(dy)
                if best is None or d < best[0]:
                    best = (d, j)
        if best:
            used.add(best[1])
            it["py"] = decode_py(pys[best[1]]["text"])
    stray = [pys[j]["text"] for j in range(len(pys)) if j not in used]
    return stray


def rows_of(items):
    """Cluster non-pinyin items into rows by vertical centre."""
    body = [it for it in items if it["kind"] in ("char", "digit", "section", "garden")]
    body.sort(key=lambda it: (it["bbox"][1] + it["bbox"][3]) / 2)
    rows = []
    for it in body:
        cy = (it["bbox"][1] + it["bbox"][3]) / 2
        if rows and abs(cy - rows[-1]["cy"]) < 9:
            rows[-1]["items"].append(it)
            n = len(rows[-1]["items"])
            rows[-1]["cy"] = (rows[-1]["cy"] * (n - 1) + cy) / n
        else:
            rows.append({"cy": cy, "items": [it]})
    for r in rows:
        r["items"].sort(key=lambda it: it["bbox"][0])
    return rows


def split_columns(rows, page_width):
    """Return list of x-ranges (columns). Two columns if a vertical gap separates them."""
    xs = [(it["bbox"][0], it["bbox"][2]) for r in rows for it in r["items"]]
    if not xs:
        return [(0, page_width)]
    lo = min(x0 for x0, _ in xs); hi = max(x1 for _, x1 in xs)
    # scan for a gap >= 14pt inside (lo+40, hi-40) that no item crosses
    step = 1.0
    x = lo + 40
    best = None
    while x < hi - 40:
        gap_start = x
        while x < hi - 40 and not any(x0 - 1 < x < x1 + 1 for x0, x1 in xs):
            x += step
        if x - gap_start >= 14:
            best = (gap_start, x)
            break
        x += step
    if not best:
        return [(lo - 1, hi + 1)]
    mid = (best[0] + best[1]) / 2
    # both sides must hold lesson labels/gardens to count as columns
    left = [it for r in rows for it in r["items"] if it["bbox"][0] < mid and it["kind"] in ("digit", "garden", "section")]
    right = [it for r in rows for it in r["items"] if it["bbox"][0] >= mid and it["kind"] in ("digit", "garden", "section")]
    if left and right:
        return [(lo - 1, mid), (mid, hi + 1)]
    return [(lo - 1, hi + 1)]


def walk(rows, columns, page_no, state):
    """Walk rows column by column and append chars to lesson groups (mutates state)."""
    for (cx0, cx1) in columns:
        for r in rows:
            for it in r["items"]:
                if not (cx0 <= it["bbox"][0] < cx1):
                    continue
                if it["kind"] == "section":
                    state["section"] = it["text"]
                elif it["kind"] == "digit":
                    g = {"section": state["section"], "num": it["n"], "label": None, "page": page_no, "chars": []}
                    state["groups"].append(g); state["cur"] = g
                elif it["kind"] == "garden":
                    g = {"section": "园地", "num": None, "label": it["text"], "page": page_no, "chars": []}
                    state["groups"].append(g); state["cur"] = g
                elif it["kind"] == "char":
                    if state["cur"] is None:
                        raise RuntimeError(f"char {it['text']} before any label on page {page_no}")
                    state["cur"]["chars"].append({"c": it["text"], "py": it.get("py"), "blue": it["blue"]})


def find_table_pages(doc):
    texts = [p.get_text() for p in doc]
    n = len(doc)
    def first(pat, lo=50):
        for i in range(lo, n):
            if re.search(pat, texts[i]):
                return i
        return None
    shizi = first(r"识\s*字\s*表")
    xiezi = first(r"写\s*字\s*表")
    words = first(r"词\s*语\s*表", (xiezi or 50) + 1)
    tail = first(r"常用笔画|常用偏旁", (xiezi or 50) + 1)
    end_xiezi = min([p for p in (words, tail, n) if p is not None])
    return shizi, xiezi, end_xiezi, words


def parse_table(doc, start, end):
    state = {"section": None, "cur": None, "groups": []}
    strays = []
    totals = []
    for pno in range(start, end):
        page = doc[pno]
        items = page_items(page)
        strays += attach_pinyin(items)
        totals += [it["n"] for it in items if it["kind"] == "total"]
        rows = rows_of(items)
        cols = split_columns(rows, page.rect.width)
        walk(rows, cols, pno + 1, state)
    return state["groups"], strays, totals


def parse_words(doc, start):
    """词语表: plain text; lesson numbers start entries, whitespace separates words."""
    groups = []
    section = None
    cur = None
    n = len(doc)
    for pno in range(start, n):
        rd = doc[pno].get_text("rawdict")
        text = doc[pno].get_text()
        if pno > start and not re.search(r"^\s*\d+\s", text, re.M):
            break
        toks = []
        for block in rd["blocks"]:
            if block["type"] != 0:
                continue
            for line in block["lines"]:
                for span in line["spans"]:
                    if "CenturyGothic" in span["font"] or span["size"] > 30 or span["size"] > 20:
                        continue
                    toks.append("".join(ch["c"] for ch in span["chars"]))
        stream = " ".join(toks)
        for tok in re.split(r"[\s　\xa0]+", stream):
            if not tok:
                continue
            if tok in ("识字", "课文"):
                section = tok; continue
            if re.fullmatch(r"\d{1,2}", tok):
                cur = {"section": section, "num": int(tok), "page": pno + 1, "words": []}
                groups.append(cur); continue
            if re.fullmatch(r"[㐀-鿿·]+", tok) and cur is not None:
                cur["words"].append(tok)
    return groups


def main():
    result = {}
    for code in BOOKS:
        doc = fitz.open(os.path.join(RAW, f"{code}.pdf"))
        shizi, xiezi, end_xiezi, words = find_table_pages(doc)
        book = {"shizi": [], "xiezi": [], "words": [], "totals": {}, "notes": []}
        if shizi is not None:
            g, strays, totals = parse_table(doc, shizi, xiezi)
            book["shizi"] = g
            book["totals"]["shizi"] = totals[0] if totals else None
            if strays: book["notes"].append(f"stray pinyin in 识字表: {strays}")
        g, strays, totals = parse_table(doc, xiezi, end_xiezi)
        book["xiezi"] = g
        book["totals"]["xiezi"] = totals[0] if totals else None
        if strays: book["notes"].append(f"stray pinyin in 写字表: {strays}")
        if words is not None:
            book["words"] = parse_words(doc, words)
        result[code] = book
        # ---- report ----
        def count(groups):
            allc = [c for g in groups for c in g["chars"]]
            return len([c for c in allc if not c["blue"]]), len([c for c in allc if c["blue"]])
        sn, sb = count(book["shizi"]); xn, xb = count(book["xiezi"])
        nopy = [c["c"] for g in book["shizi"] for c in g["chars"] if not c["py"]]
        wc = sum(len(g["words"]) for g in book["words"])
        print(f"{code}: 识字 {sn} (+{sb} blue) / stated {book['totals'].get('shizi')} | "
              f"写字 {xn} (+{xb} blue) / stated {book['totals'].get('xiezi')} | "
              f"groups {len(book['shizi'])}/{len(book['xiezi'])} | words {wc} in {len(book['words'])} lessons"
              + (f" | NO-PINYIN {nopy[:10]}" if nopy else "") + (f" | {book['notes']}" if book["notes"] else ""))
    with open(os.path.join(OUT, "tables.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
