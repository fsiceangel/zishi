// Progress persistence: localStorage is the source of truth (export/import for backup).
import { dayNumber, todayKey, grade, markKnown, markLearned, isDue } from './srs.js'

const KEY = 'zishi.v1'
let cache = null

function blank() {
  return {
    v: 1,
    profile: { name: '', current: '3a', createdAt: Date.now() },
    chars: {},      // char -> srs entry
    poems: {},      // poem id -> srs entry (+ stage)
    lessons: {},    // lesson id -> { learned: dayNumber }
    days: {},       // YYYY-MM-DD -> { review, learn, poem, write }
    settings: { newPerDay: 10, tts: true, rate: 0.9, pinyin: true },
  }
}

export function load() {
  if (cache) return cache
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    cache = raw && raw.v === 1 ? { ...blank(), ...raw, settings: { ...blank().settings, ...(raw.settings || {}) } } : blank()
  } catch {
    cache = blank()
  }
  return cache
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* private mode: progress just will not survive */
  }
  window.dispatchEvent(new Event('zishi-progress'))
}

export function update(fn) {
  const s = load()
  fn(s)
  s.updatedAt = Date.now()
  persist()
  return s
}

export function subscribe(fn) {
  window.addEventListener('zishi-progress', fn)
  return () => window.removeEventListener('zishi-progress', fn)
}

// ---- per-day activity log (drives streak + heatmap)
export function logDay(kind, n = 1) {
  update((s) => {
    const k = todayKey()
    s.days[k] ??= {}
    s.days[k][kind] = (s.days[k][kind] || 0) + n
  })
}

export function streak() {
  const days = load().days
  let n = 0
  const d = new Date()
  // today counts if active; an inactive today does not break the streak
  if (!days[todayKey(d)]) d.setDate(d.getDate() - 1)
  while (days[todayKey(d)]) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

// ---- characters
export function charEntry(c) {
  return load().chars[c] || null
}

export function gradeChar(c, correct) {
  update((s) => {
    s.chars[c] = grade(s.chars[c], correct)
  })
}

export function setCharKnown(c, known) {
  update((s) => {
    if (known) s.chars[c] = markKnown(s.chars[c])
    else s.chars[c] = { ...(s.chars[c] || { seen: 0, ok: 0, miss: 0 }), box: 0, due: dayNumber(), known: false }
  })
}

export function learnChars(list) {
  update((s) => {
    for (const c of list) s.chars[c] = markLearned(s.chars[c])
  })
}

export function markLessonLearned(lid) {
  update((s) => {
    s.lessons[lid] = { learned: dayNumber() }
  })
}

// ---- poems
export function poemEntry(pid) {
  return load().poems[pid] || null
}

export function gradePoem(pid, correct) {
  update((s) => {
    s.poems[pid] = grade(s.poems[pid], correct)
  })
}

export function learnPoem(pid) {
  update((s) => {
    s.poems[pid] = markLearned(s.poems[pid])
  })
}

// ---- due queue
export function dueChars(today = dayNumber()) {
  const s = load()
  return Object.entries(s.chars).filter(([, e]) => isDue(e, today)).map(([c]) => c)
}

export function duePoems(today = dayNumber()) {
  const s = load()
  return Object.entries(s.poems).filter(([, e]) => isDue(e, today)).map(([p]) => p)
}

// ---- settings / profile
export function setSetting(k, v) {
  update((s) => {
    s.settings[k] = v
  })
}
export function setProfile(patch) {
  update((s) => Object.assign(s.profile, patch))
}

export function exportJSON() {
  return JSON.stringify(load(), null, 1)
}

export function importJSON(text) {
  const raw = JSON.parse(text)
  if (!raw || raw.v !== 1 || typeof raw.chars !== 'object') throw new Error('不是字诗的进度文件')
  cache = { ...blank(), ...raw }
  persist()
}

export function resetAll() {
  cache = blank()
  persist()
}
