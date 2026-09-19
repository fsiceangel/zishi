# -*- coding: utf-8 -*-
"""
Parse the 目录 pages (raw/toc/*.txt, dumped from the PDFs) into an ordered list
of entries per book.  Output: tools/out/toc.json

entry = { "kind": "unit"|"section"|"lesson"|"special"|"sub"|"appendix",
          "section": "识字"|"汉语拼音"|"课文"|null, "unit": 1|null,
          "num": 3|null, "star": false, "title": "江南", "page": 58 }
"""
import re, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "raw", "toc")
OUT = os.path.join(HERE, "out")
BOOKS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b", "5a", "5b", "6a", "6b"]
CN_NUM = {c: i + 1 for i, c in enumerate("一二三四五六七八")}

APPENDIX = ("识字表", "写字表", "词语表", "常用笔画名称表", "常用偏旁名称表", "古诗词诵读")


def clean(line):
    return line.replace("​", "").replace("\xa0", " ").replace("\t", " ").strip()


def parse(text):
    keep = re.split(r"\n===== PAGE (\d+) =====\n", "\n" + text)[1:]
    pages = dict(zip(keep[0::2], keep[1::2]))
    # the TOC starts on page 4 and ends on the page that lists the 写字表 appendix
    chunks = []
    for n in (4, 5, 6, 7):
        chunks.append(pages.get(str(n), ""))
        if "写字表" in chunks[-1]:
            break
    text = "\n".join(chunks)
    dotted = bool(re.search(r"\.{3,}|…", text))   # format B (grade 2+) uses dot leaders
    lines = [clean(l) for l in text.splitlines()]
    lines = [l for l in lines if l]
    entries = []
    section = None
    unit = None
    pending_num = None      # (num, star)
    pending_special = False
    pending_title = None    # title waiting for a page-number line
    in_songdu = False

    def emit(kind, title, page, num=None, star=False):
        entries.append({"kind": kind, "section": section, "unit": unit, "num": num,
                        "star": star, "title": title, "page": page})

    i = 0
    while i < len(lines):
        l = lines[i]; i += 1
        if l in ("目录", "标*的是略读课文", "统编版", "*") or re.fullmatch(r"\*+", l):
            continue
        m = re.match(r"^第([一二三四五六七八]+)单元[.…\s]*(\d+)?$", l)
        if m:
            unit = CN_NUM[m.group(1)]; section = None
            emit("unit", f"第{m.group(1)}单元", int(m.group(2)) if m.group(2) else None)
            continue
        if l in ("识字", "汉语拼音", "课文"):
            section = l
            emit("section", l, None)
            continue
        if l == "古诗词诵读":
            in_songdu = True; section = None
            emit("appendix", l, None)
            continue
        # "title ..... page" on one line (possibly with a leading number / ◎)
        m = re.match(r"^(?:(\d{1,2})(\*?)\s+)?(?:(◎)\s*)?(.+?)\s*[.…]{2,}\s*(\d+)$", l)
        if m and not re.fullmatch(r"\d+", m.group(4)):
            num, star, circ, title, page = m.group(1), m.group(2) == "*", m.group(3), m.group(4).strip(), int(m.group(5))
            if pending_num and not num:
                num, star = pending_num; pending_num = None
            if num:
                if in_songdu:
                    emit("songdu", title, page, int(num))
                else:
                    emit("lesson", title, page, int(num), star)
            elif circ or pending_special:
                emit("special", title, page); pending_special = False
            elif title.startswith(APPENDIX) or title in APPENDIX:
                emit("appendix", title, page)
            elif entries and entries[-1]["kind"] in ("lesson", "sub", "special", "songdu"):
                emit("sub", title, page)
            else:
                emit("special", title, page)
            continue
        # page number alone -> belongs to pending title (grade-1 format only; dotted TOCs put pages after leaders)
        if not dotted and re.fullmatch(r"\d{1,3}", l) and pending_title is not None:
            title = pending_title; pending_title = None; page = int(l)
            if pending_num:
                num, star = pending_num; pending_num = None
                emit("lesson", title, page, int(num), star)
            elif pending_special:
                emit("special", title, page); pending_special = False
            elif title in APPENDIX:
                emit("appendix", title, page)
            else:
                emit("special", title, page)
            continue
        # number alone
        m = re.fullmatch(r"(\d{1,2})(\*?)", l)
        if m:
            pending_num = (m.group(1), m.group(2) == "*"); continue
        if l == "◎":
            pending_special = True; continue
        # "◎ title" without page on this line
        m = re.match(r"^◎\s*(.+)$", l)
        if m:
            pending_special = True; pending_title = m.group(1).strip(); continue
        # "num title" without page
        m = re.match(r"^(\d{1,2})(\*?)\s+(\S.*)$", l)
        if m and not re.search(r"\d+$", l):
            pending_num = (m.group(1), m.group(2) == "*"); pending_title = m.group(3).strip(); continue
        # plain title line (page on next line) - join continuation lines like "习作：他____了"
        if pending_title is not None and not re.fullmatch(r"\d{1,3}", l):
            if dotted:
                pending_title += l
            else:
                # grade-1 format: one title per line; a title without a page is a sub-entry (poem name)
                emit("sub", pending_title, None)
                pending_title = l
        else:
            pending_title = l
    # give page-less entries (section headers, 古诗词诵读) the page of the next entry, then sort
    nxt = None
    for e in reversed(entries):
        if e["page"] is None:
            e["page_sort"] = nxt if nxt is not None else 0
        else:
            e["page_sort"] = e["page"]; nxt = e["page"]
    entries.sort(key=lambda e: e["page_sort"])
    # units are assigned in page order (the content stream may interleave TOC columns)
    cur = None
    for e in entries:
        del e["page_sort"]
        if e["kind"] == "unit":
            cur = CN_NUM[re.match(r"第([一二三四五六七八]+)单元", e["title"]).group(1)]
        elif cur is not None:
            e["unit"] = cur
    return entries


def main():
    result = {}
    for code in BOOKS:
        text = open(os.path.join(RAW, f"{code}.txt"), encoding="utf-8").read()
        entries = parse(text)
        result[code] = entries
        lessons = [e for e in entries if e["kind"] == "lesson"]
        subs = [e for e in entries if e["kind"] == "sub"]
        units = [e for e in entries if e["kind"] == "unit"]
        print(f"{code}: {len(lessons)} lessons, {len(subs)} subs, {len(units)} units, "
              f"{len([e for e in entries if e['kind']=='special'])} specials; "
              f"first: {[ (e['section'], e['num'], e['title']) for e in lessons[:3]]}")
    with open(os.path.join(OUT, "toc.json"), "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
