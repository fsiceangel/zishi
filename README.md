# 字诗 · 识字与古诗

给小学生用的识字 + 背古诗网站，内容严格对应**部编版（统编版）小学语文 1–6 年级全部 12 册**：

- **识字表 3000 字、写字表 2500 字**，按册 → 单元 → 课的顺序组织，每个字带课本标注的读音、多音字、例词、笔顺动画与描红。
- **113 首古诗词**：课文里的《古诗二首/三首》、语文园地「日积月累」里的诗词，以及六下附录「古诗词诵读」，每个字都标了课本读法的拼音。
- **循序渐进的复习**：Leitner 分箱（1 / 2 / 4 / 7 / 15 / 30 / 60 天），答对升箱、答错回箱；每册可以先「摸底」，把已经认识的字标掉，之后只盯着不会的。
- 题型都是客观题：选拼音、听音选字、笔顺听写（Hanzi Writer）、古诗填空 / 接句 / 辨诗题。
- 纯静态站，进度存在浏览器 localStorage，设置页可导出 / 导入备份。

线上地址：https://fsiceangel.github.io/zishi/

## 目录

```
tools/            数据管线（Python）
  extract_tables.py   从教材 PDF 逐字符（按坐标）解析识字表 / 写字表 / 词语表
  parse_toc.py        解析目录页 → 单元 / 课号 / 课题 / 页码
  poems.json          手工整理的诗词清单（册、页码、题、作者、朝代、原文）
  verify_poems.py     每一句逐字与教材文本层比对
  poem_pinyin.py      读取教材页面上印在字旁的拼音，作为诗词注音的依据
  mine_words.py       用 jieba 从课文正文挖真实例词，按课本读音过滤
  build_data.py       总装 → src/data/*.json（含 pypinyin 兜底 + 古音读法覆盖表）
  strokes.py          拷贝 Hanzi Writer 笔顺数据到 public/strokes
  subset_font.py      把霞鹜文楷 GB 子集化成 public/fonts/wenkai.woff2
  validate.mjs        CI 校验：3000 / 2500 总数、引用完整、拼音对齐、笔顺齐全
src/               React + Vite 站点
public/strokes/    2999 个字的笔顺数据（Arphic Public License，见 LICENSE.txt）
public/fonts/      霞鹜文楷 GB 子集（SIL OFL 1.1，见 LICENSE.txt）
```

## 重建数据

教材 PDF 不入库。把 12 册统编版 PDF 放到 `raw/1a.pdf … 6b.pdf`（一上 = 1a，六下 = 6b），然后：

```bash
pip install pymupdf pypinyin jieba fonttools brotli
python tools/extract_tables.py     # 每册打印识字 / 写字计数，须与教材「共 N 个字」一致
python tools/parse_toc.py
python tools/verify_poems.py       # 113 首逐字校验
python tools/poem_pinyin.py
python tools/mine_words.py
python tools/build_data.py         # 报告里会列出所有与 pypinyin 默认读音不同的字，供人工复核
python tools/strokes.py
python tools/subset_font.py        # 需要 raw/fonts/LXGWWenKaiGB-Regular.ttf
npm run validate
```

数据上的已知情况（都是教材本身如此，脚本按原样保留）：

- 识字表里蓝色的多音字不计入总数，站内作为该字的「又读」记录在原字下。
- 有 13 个字在两册识字表里都作为新字出现，13 个字在两册写字表里出现；11 个写字表的字从未进过识字表（读音用 pypinyin 兜底）。
- 六年级两册没有识字表，只有写字表。
- 语文园地「日积月累」里的成语、谚语、名言暂未纳入，只收古诗词。

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 输出 dist/，GitHub Pages 以 /zishi/ 为根
```

推送到 `main` 后由 GitHub Actions 自动校验、构建并部署。
