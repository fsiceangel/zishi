// Data integrity checks, run in CI before every build (npm run validate).
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const volumes = read('src/data/volumes.json')
const chars = read('src/data/chars.json')
const poems = read('src/data/poems.json')
const words = read('src/data/words.json')
const problems = []
const check = (ok, msg) => !ok && problems.push(msg)
const CJK = /[㐀-鿿]/

// 部编版 totals: 3000 会认 / 2500 会写
const shizi = volumes.reduce((n, v) => n + v.stats.shizi, 0)
const xiezi = volumes.reduce((n, v) => n + v.stats.xiezi, 0)
check(shizi === 3000, `识字 total ${shizi} != 3000`)
check(xiezi === 2500, `写字 total ${xiezi} != 2500`)
check(volumes.length === 12, `volumes ${volumes.length} != 12`)
check(poems.length >= 113, `poems ${poems.length} < 113`)

const poemIds = new Set(poems.map((p) => p.id))
const lessonIds = new Set()
for (const v of volumes) {
  for (const lid of v.order) {
    const l = v.lessons[lid]
    check(!!l, `${v.id}: order references missing lesson ${lid}`)
    if (!l) continue
    lessonIds.add(lid)
    for (const c of [...l.shizi, ...l.xiezi]) check(!!chars[c], `${lid}: char ${c} missing in chars.json`)
    for (const p of l.poems) check(poemIds.has(p), `${lid}: poem ${p} missing`)
    for (const w of l.words) check(!!words[w], `${lid}: word ${w} has no pinyin`)
    check(!!l.title, `${lid}: no title`)
  }
  for (const u of v.units) for (const lid of u.lessons) check(v.order.includes(lid), `${v.id} unit ${u.no}: ${lid} not in order`)
}

for (const [c, info] of Object.entries(chars)) {
  check(!!info.py, `char ${c}: no pinyin`)
  check(lessonIds.has(info.first), `char ${c}: first lesson ${info.first} unknown`)
  check(!info.write || lessonIds.has(info.write), `char ${c}: write lesson ${info.write} unknown`)
  check(existsSync(join(root, 'public', 'strokes', `${c.codePointAt(0).toString(16)}.json`)), `char ${c}: no stroke data`)
  for (const w of info.words) check(w.includes(c), `char ${c}: example word ${w} does not contain it`)
}

for (const p of poems) {
  check(lessonIds.has(p.lesson), `poem ${p.id} ${p.title}: lesson ${p.lesson} unknown`)
  check(p.lines.length === p.py.length, `poem ${p.id}: py rows ${p.py.length} != lines ${p.lines.length}`)
  p.lines.forEach((line, i) => {
    const n = [...line].filter((ch) => CJK.test(ch)).length
    check(p.py[i] && p.py[i].length === n, `poem ${p.id} line ${i}: ${p.py[i]?.length} syllables for ${n} chars`)
    for (const s of p.py[i] || []) check(/^[a-zü]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜaeiouü][a-zü]*$/.test(s), `poem ${p.id}: odd syllable ${s}`)
  })
}
check(existsSync(join(root, 'public', 'fonts', 'wenkai.woff2')), 'font subset missing')

if (problems.length) {
  console.error(`✗ ${problems.length} problems`)
  for (const p of problems.slice(0, 50)) console.error('  ' + p)
  process.exit(1)
}
console.log(`✓ ${volumes.length} volumes, ${Object.keys(chars).length} chars (识字 ${shizi} / 写字 ${xiezi}), ${poems.length} poems, ${Object.keys(words).length} words`)
