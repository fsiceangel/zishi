// Static content built by tools/build_data.py (never edit src/data by hand).
import volumesRaw from '../data/volumes.json'
import charsRaw from '../data/chars.json'
import poemsRaw from '../data/poems.json'
import wordsPy from '../data/words.json'
import meta from '../data/meta.json'

export const VOLUMES = volumesRaw
export const CHARS = charsRaw            // char -> { py, readings, first, write, words, book, grade, again? }
export const POEMS = poemsRaw            // [{ id, book, lesson, title, ... }]
export const WORDS_PY = wordsPy          // word -> "pīn yīn"
export const META = meta

export const VOLUME_BY_ID = Object.fromEntries(VOLUMES.map((v) => [v.id, v]))
export const POEM_BY_ID = Object.fromEntries(POEMS.map((p) => [p.id, p]))
export const LESSON_BY_ID = {}
for (const v of VOLUMES) for (const l of Object.values(v.lessons)) LESSON_BY_ID[l.id] = l

export const GRADE_NAMES = ['', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
export const KIND_LABEL = { 识字: '识字', 课文: '课文', 汉语拼音: '拼音', 园地: '园地', 诵读: '诵读' }

export function volumeOfLesson(lid) {
  return VOLUME_BY_ID[lid.slice(0, 2)]
}

export function lessonLabel(lid, withBook = true) {
  const l = LESSON_BY_ID[lid]
  if (!l) return lid
  const v = volumeOfLesson(lid)
  const num = l.num && l.kind !== '园地' ? `${KIND_LABEL[l.kind]}${l.num} ` : l.kind === '园地' ? '' : ''
  return `${withBook ? v.short + ' · ' : ''}${num}${l.title}`
}

// characters of one lesson: 识字 (new) + 写字 flagged
export function lessonChars(l) {
  const write = new Set(l.xiezi)
  const list = l.shizi.map((c) => ({ c, write: write.has(c) }))
  for (const c of l.xiezi) if (!l.shizi.includes(c)) list.push({ c, write: true, old: true })
  return list
}

// all 识字 chars of a volume, in book order
export function volumeChars(v) {
  const out = []
  for (const lid of v.order) for (const c of v.lessons[lid].shizi) out.push(c)
  return out
}

export function volumePoems(v) {
  const out = []
  for (const lid of v.order) for (const pid of v.lessons[lid].poems) out.push(POEM_BY_ID[pid])
  return out
}

export function pinyinOf(c) {
  return CHARS[c]?.py || ''
}

export function wordPy(w) {
  return WORDS_PY[w] || ''
}

// split a word's pinyin string into one syllable per character
export function wordSyllables(w) {
  const py = wordPy(w).split(' ')
  return [...w].map((c, i) => py[i] || '')
}

const CJK = /[㐀-鿿]/
export function isCJK(c) {
  return CJK.test(c)
}

// characters of a poem line paired with their pinyin (punctuation gets '')
export function lineTokens(line, py) {
  let k = 0
  return [...line].map((ch) => (isCJK(ch) ? { ch, py: py[k++] || '' } : { ch, py: '' }))
}

export const TONE_STRIP = { ā: 'a', á: 'a', ǎ: 'a', à: 'a', ē: 'e', é: 'e', ě: 'e', è: 'e', ī: 'i', í: 'i', ǐ: 'i', ì: 'i',
  ō: 'o', ó: 'o', ǒ: 'o', ò: 'o', ū: 'u', ú: 'u', ǔ: 'u', ù: 'u', ǖ: 'ü', ǘ: 'ü', ǚ: 'ü', ǜ: 'ü' }
export function toneless(py) {
  return [...py].map((c) => TONE_STRIP[c] || c).join('')
}
export function toneOf(py) {
  for (const c of py) {
    if ('āēīōūǖ'.includes(c)) return 1
    if ('áéíóúǘ'.includes(c)) return 2
    if ('ǎěǐǒǔǚ'.includes(c)) return 3
    if ('àèìòùǜ'.includes(c)) return 4
  }
  return 0
}
const INITIALS = ['zh', 'ch', 'sh', 'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w']
export function splitSyllable(py) {
  const t = toneless(py)
  const ini = INITIALS.find((i) => t.startsWith(i)) || ''
  return { ini, fin: t.slice(ini.length), tone: toneOf(py) }
}
