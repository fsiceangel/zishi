import { VOLUMES, volumeChars, volumePoems, CHARS, POEMS } from './data.js'
import { load } from './storage.js'
import { stageOf } from './srs.js'

export function volumeStats(v, state = load()) {
  const chars = volumeChars(v)
  let mastered = 0, learning = 0, weak = 0
  for (const c of chars) {
    const st = stageOf(state.chars[c])
    if (st === 'mastered') mastered++
    else if (st === 'learning') learning++
    else if (st === 'weak') weak++
  }
  const poems = volumePoems(v)
  let pMastered = 0, pLearning = 0
  for (const p of poems) {
    const st = stageOf(state.poems[p.id])
    if (st === 'mastered') pMastered++
    else if (st !== 'new') pLearning++
  }
  const xiezi = v.order.flatMap((lid) => v.lessons[lid].xiezi)
  let wMastered = 0, wLearning = 0
  for (const c of xiezi) {
    const st = stageOf(state.chars[c])
    if (st === 'mastered') wMastered++
    else if (st !== 'new') wLearning++
  }
  const lessonsDone = v.order.filter((lid) => state.lessons[lid]).length
  return { chars: chars.length, mastered, learning, weak, poems: poems.length, pMastered, pLearning,
    xiezi: xiezi.length, wMastered, wLearning, lessons: v.order.length, lessonsDone }
}

// the first lesson in book order that has not been finished and has something to learn
export function nextLesson(v, state = load()) {
  for (const lid of v.order) {
    const l = v.lessons[lid]
    if (!state.lessons[lid] && (l.shizi.length || l.poems.length)) return l
  }
  return null
}

export function nextPoem(v, state = load()) {
  for (const p of volumePoems(v)) if (!state.poems[p.id]) return p
  return null
}

export function overall(state = load()) {
  let mastered = 0, learning = 0
  for (const c of Object.keys(CHARS)) {
    const st = stageOf(state.chars[c])
    if (st === 'mastered') mastered++
    else if (st !== 'new') learning++
  }
  let pMastered = 0, pLearning = 0
  for (const p of POEMS) {
    const st = stageOf(state.poems[p.id])
    if (st === 'mastered') pMastered++
    else if (st !== 'new') pLearning++
  }
  return { chars: Object.keys(CHARS).length, mastered, learning, poems: POEMS.length, pMastered, pLearning }
}

export function todayCounts(state = load()) {
  const d = new Date()
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return state.days[key] || {}
}

export { VOLUMES }
