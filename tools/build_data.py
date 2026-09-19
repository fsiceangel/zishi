# -*- coding: utf-8 -*-
"""
Assemble the site data from the extracted tables, TOC and curated poems.

  tools/out/tables.json  (extract_tables.py)   识字表 / 写字表 / 词语表 per book
  tools/out/toc.json     (parse_toc.py)        lesson titles, units, pages
  tools/poems.json       (hand-curated, verified by verify_poems.py)
  tools/out/poem_pinyin_pdf.json (poem_pinyin.py)  pinyin printed next to poem characters

  ->  src/data/volumes.json   12 books: units -> lessons -> chars / words / poems
      src/data/chars.json     every character: pinyin, readings, first lesson, write lesson, example words
      src/data/poems.json     poems with per-character pinyin
      src/data/meta.json      counts
"""
import json, os, re, sys, collections
from pypinyin import pinyin, Style, load_phrases_dict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
DATA = os.path.join(HERE, "..", "src", "data")
os.makedirs(DATA, exist_ok=True)

BOOKS = [("1a", "一年级上册", "一上", 1, 1), ("1b", "一年级下册", "一下", 1, 2),
         ("2a", "二年级上册", "二上", 2, 1), ("2b", "二年级下册", "二下", 2, 2),
         ("3a", "三年级上册", "三上", 3, 1), ("3b", "三年级下册", "三下", 3, 2),
         ("4a", "四年级上册", "四上", 4, 1), ("4b", "四年级下册", "四下", 4, 2),
         ("5a", "五年级上册", "五上", 5, 1), ("5b", "五年级下册", "五下", 5, 2),
         ("6a", "六年级上册", "六上", 6, 1), ("6b", "六年级下册", "六下", 6, 2)]
BOOK_INDEX = {b[0]: i for i, b in enumerate(BOOKS)}
CN = "一二三四五六七八"
SECTION_CODE = {"识字": "s", "课文": "k", "汉语拼音": "p", None: "k"}
CJK = re.compile(r"[㐀-鿿]")

tables = json.load(open(os.path.join(OUT, "tables.json"), encoding="utf-8"))
toc = json.load(open(os.path.join(OUT, "toc.json"), encoding="utf-8"))
poems_src = json.load(open(os.path.join(HERE, "poems.json"), encoding="utf-8"))
pdf_py = json.load(open(os.path.join(OUT, "poem_pinyin_pdf.json"), encoding="utf-8"))

# Readings the textbook uses that pypinyin's defaults get wrong (classical usage).
# key: (poem title, char) or (poem title, line index, char)
OVERRIDES = {
    ("回乡偶书", "少"): "shào", ("浣溪沙", "少"): "shào", ("长歌行", "少"): "shào",
    ("敕勒歌", "见"): "xiàn", ("西江月·夜行黄沙道中", "见"): "xiàn",
    ("梅花", "为"): "wèi", ("观书有感（其一）", "为"): "wèi", ("蜂", "为"): "wèi",
    ("早发白帝城", "还"): "huán", ("泊船瓜洲", "还"): "huán", ("出塞", "还"): "huán", ("从军行", "还"): "huán",
    ("小儿垂钓", "应"): "yìng",
    ("渔歌子", "塞"): "sài",
    ("雪梅", "降"): "xiáng", ("雪梅", "阁"): "gē",
    ("浪淘沙（其一）", "曲"): "qū", ("咏鹅", "曲"): "qū",
    ("清平乐·村居", "亡"): "wú", ("清平乐·村居", "剥"): "bāo", ("清平乐·村居", "乐"): "yuè",
    ("卜算子·送鲍浩然之浙东", "那"): "nǎ", ("观书有感（其一）", "那"): "nǎ",
    ("采薇（节选）", "雨"): "yù",
    ("四时田园杂兴（其三十一）", "供"): "gòng",
    ("送元二使安西", "舍"): "shè",
    ("长相思", "更"): "gēng",
    ("村居", "长"): "zhǎng",
    ("梅花", "数"): "shù", ("泊船瓜洲", "数"): "shù",
    ("早发白帝城", "重"): "chóng", ("泊船瓜洲", "重"): "chóng", ("过故人庄", "重"): "chóng",
    ("闻官军收河南河北", "卷"): "juǎn", ("六月二十七日望湖楼醉书", "卷"): "juǎn",
    ("马诗", "燕"): "yān",
    ("夜书所见", "挑"): "tiǎo",
    ("早发白帝城", "朝"): "zhāo", ("送元二使安西", "朝"): "zhāo", ("长歌行", "朝"): "zhāo",
    ("长歌行", "华"): "huā",
    ("出塞", "教"): "jiào", ("出塞", "将"): "jiàng",
    ("闻官军收河南河北", "裳"): "cháng",
    ("竹石", "劲"): "jìng",
    ("绝句", "行"): "háng",
    ("塞下曲", "单"): "chán",
    ("闻官军收河南河北", "妻"): "qī",
    ("江南", "间"): "jiān",
    ("卜算子·咏梅", "犹"): "yóu",
    ("宿新市徐公店", "阴"): "yīn",
    ("赠刘景文", "擎"): "qíng",
    ("蝉", "緌"): "ruí",
    ("寒食", "御"): "yù",
    ("十五夜望月", "落"): "luò",
    ("己亥杂诗", "重"): "chóng", ("己亥杂诗", "降"): "jiàng",
    ("回乡偶书", "衰"): "shuāi", ("山行", "斜"): "xié", ("风", "斜"): "xié", ("过故人庄", "斜"): "xié", ("寒食", "斜"): "xié",
    ("所见", "骑"): "qí", ("塞下曲", "骑"): "qí",
    ("敕勒歌", "似"): "sì", ("马诗", "似"): "sì", ("暮江吟", "似"): "sì", ("咏柳", "似"): "sì",
    ("登鹳雀楼", "尽"): "jìn", ("画", "还"): "hái", ("竹石", "还"): "hái", ("过故人庄", "还"): "hái",
    ("江雪", "蓑"): "suō", ("渔歌子", "蓑"): "suō",
    ("浣溪沙", "少"): "shào", ("春晓", "少"): "shǎo", ("乡村四月", "少"): "shǎo", ("九月九日忆山东兄弟", "少"): "shǎo",
    ("夏日绝句", "为"): "wéi", ("九月九日忆山东兄弟", "为"): "wéi",
    ("长歌行", "衰"): "shuāi",
    ("宿建德江", "泊"): "bó", ("采薇（节选）", "行"): "xíng", ("夏日绝句", "当"): "dāng", ("稚子弄冰", "当"): "dàng",
    ("四时田园杂兴（其三十一）", "种"): "zhòng", ("观书有感（其二）", "行"): "xíng", ("游子吟", "缝"): "féng",
    ("早春呈水部张十八员外", "都"): "dū", ("从军行", "长"): "cháng", ("黄鹤楼送孟浩然之广陵", "长"): "cháng",
    ("四时田园杂兴（其二十五）", "长"): "cháng", ("大林寺桃花", "长"): "cháng", ("书湖阴先生壁", "长"): "cháng",
    ("暮江吟", "铺"): "pū", ("乡村四月", "了"): "liǎo", ("鹿柴", "景"): "yǐng", ("村晚", "陂"): "bēi",
}
# pypinyin defaults that are fine in modern text but wrong for these single-char poem uses
CHAR_DEFAULT = {"处": "chù", "着": "zhe", "尽": "jìn"}

# title / author readings
TITLE_OVERRIDES = {
    "鹿柴": "lù zhài", "清平乐": "qīng píng yuè", "清平乐·村居": "qīng píng yuè · cūn jū",
    "长相思": "cháng xiāng sī", "长歌行": "cháng gē xíng", "七律·长征": "qī lǜ · cháng zhēng",
    "四时田园杂兴（其二十五）": "sì shí tián yuán zá xìng （qí èr shí wǔ）",
    "四时田园杂兴（其三十一）": "sì shí tián yuán zá xìng （qí sān shí yī）",
    "出塞": "chū sài", "塞下曲": "sài xià qǔ", "采莲曲": "cǎi lián qǔ",
    "宿新市徐公店": "sù xīn shì xú gōng diàn", "宿建德江": "sù jiàn dé jiāng", "夜宿山寺": "yè sù shān sì",
    "卜算子·咏梅": "bǔ suàn zǐ · yǒng méi", "卜算子·送鲍浩然之浙东": "bǔ suàn zǐ · sòng bào hào rán zhī zhè dōng",
    "采薇（节选）": "cǎi wēi （jié xuǎn）", "送元二使安西": "sòng yuán èr shǐ ān xī",
    "山行": "shān xíng", "从军行": "cóng jūn xíng",
    "秋夜将晓出篱门迎凉有感": "qiū yè jiāng xiǎo chū lí mén yíng liáng yǒu gǎn",
    "己亥杂诗": "jǐ hài zá shī", "迢迢牵牛星": "tiáo tiáo qiān niú xīng", "渔歌子": "yú gē zǐ",
    "敕勒歌": "chì lè gē", "三衢道中": "sān qú dào zhōng", "题临安邸": "tí lín ān dǐ",
    "山居秋暝": "shān jū qiū míng", "枫桥夜泊": "fēng qiáo yè bó", "泊船瓜洲": "bó chuán guā zhōu",
    "游园不值": "yóu yuán bù zhí", "过故人庄": "guò gù rén zhuāng", "浣溪沙": "huàn xī shā",
    "西江月·夜行黄沙道中": "xī jiāng yuè · yè xíng huáng shā dào zhōng",
    "早发白帝城": "zǎo fā bái dì chéng", "六月二十七日望湖楼醉书": "liù yuè èr shí qī rì wàng hú lóu zuì shū",
    "书湖阴先生壁": "shū hú yīn xiān shēng bì", "赋得古原草送别（节选）": "fù dé gǔ yuán cǎo sòng bié （jié xuǎn）",
    "古朗月行（节选）": "gǔ lǎng yuè xíng （jié xuǎn）", "悯农（其一）": "mǐn nóng （qí yī）", "悯农（其二）": "mǐn nóng （qí èr）",
    "观书有感（其一）": "guān shū yǒu gǎn （qí yī）", "观书有感（其二）": "guān shū yǒu gǎn （qí èr）",
    "浪淘沙（其一）": "làng táo shā （qí yī）", "凉州词": "liáng zhōu cí", "画鸡": "huà jī",
    "舟夜书所见": "zhōu yè shū suǒ jiàn", "所见": "suǒ jiàn", "夜书所见": "yè shū suǒ jiàn",
    "十五夜望月": "shí wǔ yè wàng yuè", "石灰吟": "shí huī yín", "暮江吟": "mù jiāng yín",
    "游子吟": "yóu zǐ yín", "乡村四月": "xiāng cūn sì yuè",
}
AUTHOR_OVERRIDES = {"查慎行": "zhā shèn xíng", "曾几": "zēng jǐ", "翁卷": "wēng juǎn", "卢钺": "lú yuè",
                    "韩翃": "hán hóng", "郑燮": "zhèng xiè", "王之涣": "wáng zhī huàn", "纳兰性德": "nà lán xìng dé",
                    "《古诗十九首》": "", "《诗经·小雅》": "", "汉乐府": "hàn yuè fǔ", "北朝民歌": "běi cháo mín gē"}


TONE_MAP = str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaeeeeiiiioooouuuuüüüü")


def toneless(py):
    return py.translate(TONE_MAP)


def py_of(text):
    """pinyin per CJK character of text (pypinyin, phrase-aware), skipping non-CJK."""
    out = []
    for ch, p in zip(text, pinyin(text, style=Style.TONE, heteronym=False)):
        if CJK.match(ch):
            out.append(p[0])
    return out


def py_phrase(text):
    return " ".join(p[0] for p in pinyin(text, style=Style.TONE, heteronym=False) if CJK.match(p[0][0]) or True)


# ---------------------------------------------------------------- lessons
volumes = []
lessons_by_id = {}
chars = {}
report = collections.defaultdict(list)


def add_lesson(vol, lid, kind, num, title, page, unit_no, star=False):
    if lid in vol["lessons"]:
        return vol["lessons"][lid]
    les = {"id": lid, "kind": kind, "num": num, "title": title, "page": page, "unit": unit_no,
           "star": star, "shizi": [], "duoyin": [], "xiezi": [], "words": [], "poems": []}
    vol["lessons"][lid] = les
    vol["order"].append(lid)
    lessons_by_id[lid] = les
    return les


for code, name, short, grade, term in BOOKS:
    vol = {"id": code, "name": name, "short": short, "grade": grade, "term": term,
           "units": [], "lessons": {}, "order": []}
    entries = toc[code]
    grade12 = grade <= 2
    unit_no = 1
    unit_kinds = collections.defaultdict(list)
    garden_pages = {}
    for e in entries:
        u = unit_no if grade12 else (e["unit"] or 0)
        if e["kind"] == "lesson":
            kind = e["section"] or "课文"
            lid = f'{code}-{SECTION_CODE[e["section"]]}{e["num"]}'
            add_lesson(vol, lid, kind, e["num"], e["title"], e["page"], u, e["star"])
            unit_kinds[u].append(kind)
        elif e["kind"] == "special" and e["title"].startswith("语文园地"):
            garden_pages[u] = e["page"]
            if grade12:
                unit_no += 1
        elif e["kind"] == "songdu":
            add_lesson(vol, f"{code}-r", "诵读", None, "古诗词诵读", e["page"], 9)
    vol["garden_pages"] = garden_pages
    n_units = 8 if grade12 else max([e["unit"] or 0 for e in entries] + [0])
    for u in range(1, n_units + 1):
        kinds = unit_kinds.get(u, [])
        theme = collections.Counter(kinds).most_common(1)[0][0] if kinds else "课文"
        vol["units"].append({"no": u, "title": f"第{CN[u-1]}单元", "theme": theme})
    if f"{code}-r" in vol["lessons"]:
        vol["units"].append({"no": 9, "title": "古诗词诵读", "theme": "诵读"})
    volumes.append(vol)
vol_by_id = {v["id"]: v for v in volumes}


def garden_id(vol, unit_no):
    """the 语文园地 pseudo-lesson of a unit, created on demand"""
    lid = f'{vol["id"]}-g{unit_no}'
    page = vol["garden_pages"].get(unit_no)
    return add_lesson(vol, lid, "园地", unit_no, f"语文园地{CN[unit_no-1] if vol['grade'] <= 2 else ''}", page, unit_no)["id"]


def resolve_group(vol, g, last_lesson):
    if g["section"] == "园地":
        label = g["label"]
        m = re.search(r"语文园地([一二三四五六七八])", label)
        if m:
            return garden_id(vol, CN.index(m.group(1)) + 1)
        # grade 3+: "语文园地" follows the last lesson of its unit
        if last_lesson is None:
            raise RuntimeError(f'{vol["id"]}: 语文园地 group before any lesson')
        return garden_id(vol, lessons_by_id[last_lesson]["unit"])
    lid = f'{vol["id"]}-{SECTION_CODE.get(g["section"], "k")}{g["num"]}'
    if lid not in vol["lessons"]:
        raise RuntimeError(f'{vol["id"]}: group {g["section"]} {g["num"]} has no TOC lesson')
    return lid


# ---------------------------------------------------------------- characters
for code, *_ in BOOKS:
    vol = vol_by_id[code]
    t = tables[code]
    last = None
    for g in t["shizi"]:
        lid = resolve_group(vol, g, last)
        if g["section"] != "园地":
            last = lid
        les = vol["lessons"][lid]
        for ch in g["chars"]:
            c, py = ch["c"], ch["py"]
            if not ch["blue"]:
                les["shizi"].append(c)
                if c in chars:
                    report["duplicate 识字 (non-blue) char"].append(f'{c} {chars[c]["first"]} again in {lid}')
                    if py not in [r["py"] for r in chars[c]["readings"]]:
                        chars[c]["readings"].append({"py": py, "lesson": lid})
                    chars[c].setdefault("again", []).append(lid)
                    continue
                chars[c] = {"c": c, "py": py, "readings": [{"py": py, "lesson": lid}], "first": lid,
                            "write": None, "words": []}
            else:
                les["duoyin"].append({"c": c, "py": py})
                if c not in chars:
                    report["blue char never taught before"].append(f"{c} {py} in {lid}")
                    base = py_of(c)[0]   # the common reading; the blue entry is the secondary one
                    chars[c] = {"c": c, "py": base, "readings": [{"py": base, "lesson": lid}, {"py": py, "lesson": lid}],
                                "first": lid, "write": None, "words": []}
                elif py not in [r["py"] for r in chars[c]["readings"]]:
                    chars[c]["readings"].append({"py": py, "lesson": lid})
    last = None
    for g in t["xiezi"]:
        lid = resolve_group(vol, g, last)
        if g["section"] != "园地":
            last = lid
        les = vol["lessons"][lid]
        for ch in g["chars"]:
            c = ch["c"]
            les["xiezi"].append(c)
            if c not in chars:
                py = ch["py"] or py_of(c)[0]
                report["写字 char not in any 识字表"].append(f"{c} {py} in {lid}")
                chars[c] = {"c": c, "py": py, "readings": [{"py": py, "lesson": lid}], "first": lid,
                            "write": lid, "words": []}
            else:
                if chars[c]["write"]:
                    report["char in two 写字表"].append(f'{c} {chars[c]["write"]} and {lid}')
                else:
                    chars[c]["write"] = lid
                if ch["py"] and ch["py"] not in [r["py"] for r in chars[c]["readings"]]:
                    report["写字表 pinyin differs from 识字表"].append(f'{c} {ch["py"]} vs {chars[c]["readings"]} in {lid}')
    # 词语表
    for g in t["words"]:
        lid = f'{code}-{SECTION_CODE.get(g["section"], "k")}{g["num"]}'
        if lid not in vol["lessons"]:
            report["词语表 lesson missing"].append(f"{code} {g['section']} {g['num']}")
            continue
        les = vol["lessons"][lid]
        for w in g["words"]:
            if w not in les["words"]:
                les["words"].append(w)
            for c in set(w):
                if c in chars:
                    chars[c]["words"].append((w, lid))

mined = json.load(open(os.path.join(OUT, "mined_words.json"), encoding="utf-8")) if os.path.exists(os.path.join(OUT, "mined_words.json")) else {}
# hand-authored fallback words (tools/extra_words.json); each must contain the char read with its textbook pinyin
extra_path = os.path.join(HERE, "extra_words.json")
extra = json.load(open(extra_path, encoding="utf-8")) if os.path.exists(extra_path) else {}
for c, ws in list(extra.items()):
    good = []
    for w in ws:
        trusted = w.startswith("!")   # "!" marks words whose reading was checked by hand (pypinyin gets them wrong)
        w = w.lstrip("!")
        if c not in w or not (2 <= len(w) <= 4) or not all(CJK.match(x) for x in w) or c not in chars:
            report["extra word rejected (shape)"].append(f"{c}: {w}"); continue
        wp = pinyin(w, style=Style.TONE, heteronym=False)
        if not trusted and wp[w.index(c)][0] != chars[c]["py"]:
            report["extra word rejected (reading)"].append(f'{c} {chars[c]["py"]}: {w} -> {" ".join(x[0] for x in wp)}'); continue
        good.append(w)
    extra[c] = good
# example words per char: own lesson first, then same book, then earlier/later books; max 6
for c, info in chars.items():
    seen = set(); picked = []
    own_book = info["first"][:2]
    def rank(item):
        w, lid = item
        return (0 if lid == info["first"] else 1 if lid[:2] == own_book else 2, BOOK_INDEX[lid[:2]], len(w))
    for w, lid in sorted(info["words"], key=rank):
        if w in seen or len(w) < 2:
            continue
        seen.add(w); picked.append(w)
        if len(picked) >= 6:
            break
    for w in mined.get(c, []) + extra.get(c, []):
        if len(picked) >= 4:
            break
        if w not in seen:
            seen.add(w); picked.append(w)
    info["words"] = picked
    info["book"] = own_book
    info["grade"] = BOOK_INDEX[own_book] // 2 + 1

# word pinyin (phrase-aware)
words_py = {}
for vol in volumes:
    for les in vol["lessons"].values():
        for w in les["words"]:
            if w not in words_py:
                words_py[w] = " ".join(py_of(w))
for info in chars.values():
    for w in info["words"]:
        if w not in words_py:
            words_py[w] = " ".join(py_of(w))

# ---------------------------------------------------------------- poems
def toc_entry_for(code, page, kinds):
    best = None
    for e in toc[code]:
        if e["kind"] in kinds and e["page"] and e["page"] <= page and (best is None or e["page"] >= best["page"]):
            best = e
    return best


def poem_pinyin(p, lid):
    code, title = p["book"], p["title"]
    pairs = collections.defaultdict(set)
    for pg in (p["page"], p["page"] + 1):
        for c, py in pdf_py.get(f"{code}:{pg}", []):
            if toneless(py) in {toneless(r) for r in pinyin(c, style=Style.TONE, heteronym=True)[0]}:
                pairs[c].add(py)
            else:
                report["pdf pinyin rejected (implausible for char)"].append(f"{code} p{pg} {c} {py}")
    lesson_py = {}
    for c, info in chars.items():
        for r in info["readings"]:
            if r["lesson"] == lid:
                lesson_py[c] = r["py"]
    lines_py = []
    sources = collections.Counter()
    for li, line in enumerate(p["lines"]):
        default = py_of(line)
        cjk = CJK.findall(line)
        out = []
        for ci, c in enumerate(cjk):
            key3 = (title, li, c); key2 = (title, c)
            if key3 in OVERRIDES:
                py = OVERRIDES[key3]; sources["override"] += 1
            elif key2 in OVERRIDES:
                py = OVERRIDES[key2]; sources["override"] += 1
            elif len(pairs.get(c, ())) == 1:
                py = next(iter(pairs[c])); sources["pdf"] += 1
            elif c in lesson_py:
                py = lesson_py[c]; sources["识字表"] += 1
            elif c in CHAR_DEFAULT:
                py = CHAR_DEFAULT[c]; sources["default"] += 1
            else:
                py = default[ci]; sources["pypinyin"] += 1
            if py != default[ci]:
                report["poem reading differs from pypinyin default"].append(f'{code} {title}: {c} {py} (pypinyin {default[ci]})')
            out.append(py)
        lines_py.append(out)
    return lines_py, sources


poems = []
counter = collections.Counter()
src_totals = collections.Counter()
for p in sorted(poems_src, key=lambda p: (BOOK_INDEX[p["book"]], p.get("page") or 0)):
    code = p["book"]; vol = vol_by_id[code]
    if "page" not in p:
        les = [e for e in toc[code] if e["kind"] == "lesson" and e["num"] == p["lesson"]]
        p["page"] = les[0]["page"]
    if p["src"] == "课文":
        e = toc_entry_for(code, p["page"], ("lesson",))
        lid = f'{code}-{SECTION_CODE[e["section"]]}{e["num"]}'
    elif p["src"] == "园地":
        e = toc_entry_for(code, p["page"], ("special",))
        assert e and e["title"].startswith("语文园地"), (p["title"], e)
        unit_no = vol["lessons"][vol["order"][0]]["unit"]  # placeholder
        # unit of the garden: the garden entry's unit (grade 3+) or count of gardens up to it (grade 1-2)
        if vol["grade"] <= 2:
            unit_no = CN.index(e["title"][-1]) + 1
        else:
            unit_no = e["unit"]
        lid = garden_id(vol, unit_no)
    else:
        lid = f"{code}-r"
    counter[code] += 1
    pid = f"{code}-{counter[code]:02d}"
    lines_py, sources = poem_pinyin(p, lid)
    src_totals.update(sources)
    title_py = TITLE_OVERRIDES.get(p["title"]) or " ".join(py_of(p["title"]))
    author_py = AUTHOR_OVERRIDES[p["author"]] if p["author"] in AUTHOR_OVERRIDES else " ".join(py_of(p["author"]))
    poem = {"id": pid, "book": code, "lesson": lid, "page": p["page"], "src": p["src"],
            "title": p["title"], "titlePy": title_py, "author": p["author"], "authorPy": author_py,
            "dynasty": p["dynasty"], "type": p.get("type", "诗"), "preface": p.get("preface"),
            "lines": p["lines"], "py": lines_py}
    poems.append(poem)
    vol["lessons"][lid]["poems"].append(pid)

# ---------------------------------------------------------------- finalize volumes
for vol in volumes:
    # keep book order: sort lesson ids by page, gardens after the lessons of their unit
    def key(lid):
        les = vol["lessons"][lid]
        return (les["unit"] or 0, 1 if les["kind"] == "园地" else 0, les["page"] or 0, lid)
    vol["order"].sort(key=key)
    for u in vol["units"]:
        u["lessons"] = [lid for lid in vol["order"] if vol["lessons"][lid]["unit"] == u["no"]]
    vol["stats"] = {
        "shizi": sum(len(l["shizi"]) for l in vol["lessons"].values()),
        "xiezi": sum(len(l["xiezi"]) for l in vol["lessons"].values()),
        "words": sum(len(l["words"]) for l in vol["lessons"].values()),
        "poems": sum(len(l["poems"]) for l in vol["lessons"].values()),
    }
    del vol["garden_pages"]
    # drop empty garden lessons (no chars, no poems)
    for lid in list(vol["order"]):
        les = vol["lessons"][lid]
        if les["kind"] == "园地" and not (les["shizi"] or les["xiezi"] or les["poems"] or les["duoyin"]):
            vol["order"].remove(lid); del vol["lessons"][lid]
            for u in vol["units"]:
                if lid in u["lessons"]:
                    u["lessons"].remove(lid)

# ---------------------------------------------------------------- write
json.dump(volumes, open(os.path.join(DATA, "volumes.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump({c: {k: v for k, v in info.items() if k != "c"} for c, info in chars.items()},
          open(os.path.join(DATA, "chars.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(poems, open(os.path.join(DATA, "poems.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
json.dump(words_py, open(os.path.join(DATA, "words.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
meta = {"books": [{"id": v["id"], **v["stats"]} for v in volumes],
        "chars": len(chars), "shizi": sum(v["stats"]["shizi"] for v in volumes),
        "xiezi": sum(v["stats"]["xiezi"] for v in volumes), "poems": len(poems)}
json.dump(meta, open(os.path.join(DATA, "meta.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# ---------------------------------------------------------------- report
for v in volumes:
    s = v["stats"]
    print(f'{v["id"]} {v["short"]}: units {len(v["units"])} lessons {len(v["order"])} 识字 {s["shizi"]} 写字 {s["xiezi"]} 词语 {s["words"]} 诗 {s["poems"]}')
print(f'\nchars {meta["chars"]}  识字 {meta["shizi"]}  写字 {meta["xiezi"]}  poems {meta["poems"]}  words {len(words_py)}')
print("poem pinyin sources:", dict(src_totals))
nowords = [c for c, i in chars.items() if not i["words"]]
print(f"chars without example words: {len(nowords)}  e.g. {''.join(nowords[:60])}")
for k, v in report.items():
    print(f"\n## {k} ({len(v)})")
    for line in v[:400]:
        print("  ", line)
