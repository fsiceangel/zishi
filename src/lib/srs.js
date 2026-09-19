// Leitner-style spaced repetition. Box n is reviewed after INTERVALS[n] days.
export const INTERVALS = [0, 1, 2, 4, 7, 15, 30, 60]
export const MAX_BOX = INTERVALS.length - 1
export const MASTERED_BOX = 5 // box >= 5 counts as "掌握"

export function todayKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dayNumber(d = new Date()) {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000)
}

export function isDue(entry, today = dayNumber()) {
  return entry && entry.due != null && entry.due <= today
}

// grade an answer: correct -> promote one box; wrong -> back to box 1 (or 0 when it was new)
export function grade(entry, correct, today = dayNumber()) {
  const e = entry ? { ...entry } : { box: 0, seen: 0, ok: 0, miss: 0 }
  e.seen = (e.seen || 0) + 1
  if (correct) {
    e.ok = (e.ok || 0) + 1
    e.box = Math.min(MAX_BOX, (e.box || 0) + 1)
  } else {
    e.miss = (e.miss || 0) + 1
    e.box = e.box >= 3 ? 1 : 0
  }
  e.due = today + INTERVALS[e.box]
  e.last = today
  return e
}

// mark as already known (placement): lands in box 4, first review in a week
export function markKnown(entry, today = dayNumber()) {
  const e = entry ? { ...entry } : { seen: 0, ok: 0, miss: 0 }
  e.box = Math.max(e.box || 0, 4)
  e.due = today + INTERVALS[e.box]
  e.last = today
  e.known = true
  return e
}

// first exposure in a lesson: box 1, due tomorrow
export function markLearned(entry, today = dayNumber()) {
  if (entry && entry.box >= 1) return entry
  return { ...(entry || { seen: 0, ok: 0, miss: 0 }), box: 1, due: today + INTERVALS[1], last: today }
}

export function stageOf(entry) {
  if (!entry) return 'new'
  if (entry.box >= MASTERED_BOX) return 'mastered'
  if (entry.box >= 1) return 'learning'
  return 'weak'
}

export const STAGE_LABEL = { new: '未学', weak: '待巩固', learning: '学习中', mastered: '已掌握' }
