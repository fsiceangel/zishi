// Question generators. Every question is objective (multiple choice or a stroke quiz).
import { CHARS, POEMS, POEM_BY_ID, splitSyllable, toneless, isCJK, LESSON_BY_ID } from './data.js'

export function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
export function pick(arr, n) {
  return shuffle(arr).slice(0, n)
}

const ALL_CHARS = Object.keys(CHARS)
const BY_TONELESS = {}
const BY_INI = {}
const BY_FIN = {}
for (const c of ALL_CHARS) {
  const py = CHARS[c].py
  const { ini, fin } = splitSyllable(py)
  ;(BY_TONELESS[toneless(py)] ??= []).push(c)
  ;(BY_INI[ini] ??= []).push(c)
  ;(BY_FIN[fin] ??= []).push(c)
}

// 4 pinyin options for a character: same syllable other tones, same initial, same final
export function pinyinOptions(c) {
  const py = CHARS[c].py
  const { ini, fin, tone } = splitSyllable(py)
  const seen = new Set([py])
  const opts = []
  const add = (p) => {
    if (p && !seen.has(p) && opts.length < 3) {
      seen.add(p)
      opts.push(p)
    }
  }
  // other tones of the same syllable (a very common confusion)
  const sameSyl = pick((BY_TONELESS[toneless(py)] || []).map((x) => CHARS[x].py).filter((p) => p !== py), 2)
  sameSyl.forEach(add)
  if (opts.length < 2) {
    const fake = retone(py, tone === 1 ? 4 : tone === 4 ? 2 : tone === 2 ? 3 : 1)
    add(fake)
  }
  const sameIni = pick((BY_INI[ini] || []).map((x) => CHARS[x].py), 6)
  sameIni.forEach(add)
  const sameFin = pick((BY_FIN[fin] || []).map((x) => CHARS[x].py), 6)
  sameFin.forEach(add)
  pick(ALL_CHARS, 6).map((x) => CHARS[x].py).forEach(add)
  return shuffle([py, ...opts])
}

const TONES = { a: 'aāáǎà', e: 'eēéěè', i: 'iīíǐì', o: 'oōóǒò', u: 'uūúǔù', ü: 'üǖǘǚǜ' }
function retone(py, tone) {
  const base = toneless(py)
  // tone mark goes on a/e, else o, else the last vowel
  let idx = -1
  for (const v of ['a', 'e']) if ((idx = base.indexOf(v)) >= 0) break
  if (idx < 0 && base.includes('ou')) idx = base.indexOf('o')
  if (idx < 0) for (let i = base.length - 1; i >= 0; i--) if ('aeiouü'.includes(base[i])) { idx = i; break }
  if (idx < 0) return py
  const v = base[idx]
  return base.slice(0, idx) + TONES[v][tone] + base.slice(idx + 1)
}

// 4 character options for a character prompt: homophones / near-homophones, same lesson, random
export function charOptions(c, poolLesson) {
  const py = CHARS[c].py
  const seen = new Set([c])
  const opts = []
  const add = (x) => {
    if (x && !seen.has(x) && opts.length < 3 && CHARS[x]) {
      seen.add(x)
      opts.push(x)
    }
  }
  pick((BY_TONELESS[toneless(py)] || []).filter((x) => x !== c), 2).forEach(add)
  if (poolLesson) {
    const l = LESSON_BY_ID[poolLesson]
    if (l) pick(l.shizi.filter((x) => x !== c), 4).forEach(add)
  }
  const { fin } = splitSyllable(py)
  pick(BY_FIN[fin] || [], 6).forEach(add)
  pick(ALL_CHARS, 6).forEach(add)
  return shuffle([c, ...opts])
}

// a word to show as context for a character (example words), or null
export function contextWord(c) {
  const ws = CHARS[c]?.words || []
  return ws.length ? ws[Math.floor(Math.random() * Math.min(ws.length, 3))] : null
}

// ---- poems
// cloze: hide 1 or 2 characters of one line; answer by choosing the right char
export function poemCloze(p, blanks = 1) {
  const li = Math.floor(Math.random() * p.lines.length)
  const line = p.lines[li]
  const idxs = [...line].map((ch, i) => (isCJK(ch) ? i : -1)).filter((i) => i >= 0)
  const chosen = pick(idxs, Math.min(blanks, idxs.length)).sort((a, b) => a - b)
  const answers = chosen.map((i) => line[i])
  return { li, chosen, answers }
}

export function clozeOptions(answer, p) {
  const seen = new Set([answer])
  const opts = []
  const add = (x) => {
    if (x && !seen.has(x) && opts.length < 3 && isCJK(x)) {
      seen.add(x)
      opts.push(x)
    }
  }
  // other characters of the same poem first, then homophones, then random
  const own = [...p.lines.join('')].filter(isCJK)
  pick(own, 6).forEach(add)
  const py = CHARS[answer]?.py
  if (py) pick(BY_TONELESS[toneless(py)] || [], 3).forEach(add)
  pick(ALL_CHARS, 6).forEach(add)
  return shuffle([answer, ...opts])
}

// next-line: given line i, pick line i+1 among 4 lines (others from the same poem or same-length lines of other poems)
export function nextLineQuestion(p) {
  if (p.lines.length < 2) return null
  const li = Math.floor(Math.random() * (p.lines.length - 1))
  const answer = p.lines[li + 1]
  const seen = new Set([answer])
  const opts = []
  const add = (x) => {
    if (x && !seen.has(x) && opts.length < 3) {
      seen.add(x)
      opts.push(x)
    }
  }
  pick(p.lines.filter((l) => l !== answer && l !== p.lines[li]), 2).forEach(add)
  const len = [...answer].filter(isCJK).length
  const others = POEMS.filter((q) => q.id !== p.id).flatMap((q) => q.lines).filter((l) => [...l].filter(isCJK).length === len)
  pick(others, 6).forEach(add)
  pick(POEMS.flatMap((q) => q.lines), 6).forEach(add)
  return { li, prompt: p.lines[li], answer, options: shuffle([answer, ...opts]) }
}

// which poem does a line belong to (title choice)
export function titleQuestion(p) {
  const line = p.lines[Math.floor(Math.random() * p.lines.length)]
  const others = pick(POEMS.filter((q) => q.id !== p.id && q.title !== p.title), 3).map((q) => q.title)
  return { line, answer: p.title, options: shuffle([p.title, ...others]) }
}

export { POEM_BY_ID }
