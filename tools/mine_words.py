# -*- coding: utf-8 -*-
"""
Mine example words for characters from the textbooks' own lesson texts
(raw/txt/*.txt, pinyin lines dropped), segmented with jieba.  A word is kept for
a character only when pypinyin reads the character in that word with the
textbook reading, and its other characters were taught no later than the
character itself.  Output: tools/out/mined_words.json  { char: [word, ...] }
"""
import json, os, re, collections
import jieba
from pypinyin import pinyin, Style

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
BOOKS = ["1a", "1b", "2a", "2b", "3a", "3b", "4a", "4b", "5a", "5b", "6a", "6b"]
BOOK_INDEX = {b: i for i, b in enumerate(BOOKS)}
CJK = re.compile(r"[㐀-鿿]+")
chars = json.load(open(os.path.join(ROOT, "src", "data", "chars.json"), encoding="utf-8"))
jieba.setLogLevel(60)

# word frequency per book
freq = {}
for code in BOOKS:
    raw = open(os.path.join(ROOT, "raw", "txt", f"{code}.txt"), encoding="utf-8").read()
    lines = [l.strip() for l in raw.splitlines()]
    lines = [l for l in lines if l and not re.fullmatch(r"[A-Za-zü0-9\s\.\-:;,'’()]+", l) and not l.startswith("=====")]
    text = "".join(lines)
    cnt = collections.Counter()
    for run in CJK.findall(text):
        for w in jieba.cut(run):
            if 2 <= len(w) <= 3 and all(c in chars for c in w):
                cnt[w] += 1
    freq[code] = cnt
    print(code, "words", len(cnt))

BAD = {"什么", "怎么", "这么", "那么", "一个", "一样", "一起", "一下", "一些", "自己", "这个", "那个", "这里", "那里", "有的", "的话"}
out = {}
for c, info in chars.items():
    py = info["py"]
    book_i = BOOK_INDEX[info["book"]]
    cands = collections.defaultdict(int)
    for code, cnt in freq.items():
        for w, n in cnt.items():
            if c not in w or w in BAD:
                continue
            cands[w] += n
    scored = []
    for w, n in cands.items():
        if jieba.get_FREQ(w) is None or jieba.get_FREQ(w) < 30:   # must be a real dictionary word
            continue
        pos = w.index(c)
        wp = pinyin(w, style=Style.TONE, heteronym=False)
        if wp[pos][0] != py:
            continue
        later = max(BOOK_INDEX[chars[x]["book"]] for x in w)   # latest book among its characters
        readable = 0 if later <= book_i else 1
        scored.append((readable, -n, len(w), w))
    scored.sort()
    out[c] = [w for _, _, _, w in scored[:6]]

json.dump(out, open(os.path.join(HERE, "out", "mined_words.json"), "w", encoding="utf-8"), ensure_ascii=False)
empty = [c for c, ws in out.items() if not ws]
print(f"chars with mined words: {len(out) - len(empty)}, without: {len(empty)}: {''.join(empty[:120])}")
for c in "你我他二站六九爸妈棋句片个两西女去少尺校狗尾谁短把伞给串吗很又挂":
    print(c, chars[c]["py"], out[c])
