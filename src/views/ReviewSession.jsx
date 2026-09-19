import React, { useMemo, useState, useCallback } from 'react'
import { Link, Progress, CharTile, Ruby, SpeakButton } from '../components/ui.jsx'
import Strokes from '../components/Strokes.jsx'
import { useProgress, useOpenChar } from '../App.jsx'
import { CHARS, POEM_BY_ID, VOLUME_BY_ID, LESSON_BY_ID, wordPy, lineTokens, isCJK } from '../lib/data.js'
import { pinyinOptions, charOptions, contextWord, shuffle, pick, poemCloze, clozeOptions, nextLineQuestion, titleQuestion } from '../lib/quiz.js'
import { dueChars, duePoems, gradeChar, gradePoem, logDay, load } from '../lib/storage.js'
import { stageOf } from '../lib/srs.js'
import { speak, available as ttsAvailable } from '../lib/tts.js'

const CAP_CHARS = 40
const CAP_POEMS = 6

// Build the review queue. scope: null = everything due; "vol:1a"; "write:1a" | "write:1a-k3"
function buildQueue(scope, state) {
  const items = []
  const tts = state.settings.tts && ttsAvailable()
  const charItem = (c, forceWrite) => {
    const e = state.chars[c]
    const box = e?.box || 0
    let q = 'py'
    if (forceWrite) q = 'write'
    else if (box >= 3 && tts && Math.random() < 0.5) q = 'char'
    else if (box >= 3 && CHARS[c].write && Math.random() < 0.3) q = 'write'
    return { type: 'char', c, q, fresh: box === 0 }
  }
  if (scope && scope.startsWith('write:')) {
    const target = scope.slice(6)
    let pool
    if (LESSON_BY_ID[target]) pool = LESSON_BY_ID[target].xiezi
    else {
      const v = VOLUME_BY_ID[target]
      pool = v ? v.order.flatMap((lid) => v.lessons[lid].xiezi).filter((c) => stageOf(state.chars[c]) !== 'new') : []
      if (!pool.length && v) pool = v.order.flatMap((lid) => v.lessons[lid].xiezi)
    }
    for (const c of pick(pool, 12)) items.push(charItem(c, true))
    return items
  }
  if (scope && scope.startsWith('vol:')) {
    const v = VOLUME_BY_ID[scope.slice(4)]
    if (!v) return items
    const learned = v.order.flatMap((lid) => v.lessons[lid].shizi).filter((c) => stageOf(state.chars[c]) !== 'new')
    const due = new Set(dueChars())
    const ordered = [...learned.filter((c) => due.has(c)), ...shuffle(learned.filter((c) => !due.has(c)))]
    for (const c of ordered.slice(0, CAP_CHARS)) items.push(charItem(c))
    const poems = v.order.flatMap((lid) => v.lessons[lid].poems).filter((p) => stageOf(state.poems[p]) !== 'new')
    for (const p of pick(poems, CAP_POEMS)) items.push({ type: 'poem', id: p })
    return shuffle(items)
  }
  const dc = shuffle(dueChars()).slice(0, CAP_CHARS)
  for (const c of dc) items.push(charItem(c))
  for (const p of shuffle(duePoems()).slice(0, CAP_POEMS)) items.push({ type: 'poem', id: p })
  return shuffle(items)
}

function makeQuestion(item, state) {
  if (item.type === 'char') {
    const c = item.c
    if (item.q === 'py') return { ...item, options: pinyinOptions(c), word: contextWord(c) }
    if (item.q === 'char') return { ...item, options: charOptions(c, CHARS[c].first), word: contextWord(c) }
    return { ...item, word: contextWord(c) }
  }
  const p = POEM_BY_ID[item.id]
  const box = state.poems[item.id]?.box || 0
  const r = Math.random()
  if (box >= 3 && r < 0.35 && p.lines.length >= 2) {
    const nq = nextLineQuestion(p)
    if (nq) return { ...item, kind: 'next', p, ...nq }
  }
  if (box >= 4 && r > 0.8) return { ...item, kind: 'title', p, ...titleQuestion(p) }
  const cl = poemCloze(p, box >= 2 ? 2 : 1)
  return { ...item, kind: 'cloze', p, ...cl, options: clozeOptions(cl.answers[0], p), step: 0, given: [] }
}

export default function ReviewSession({ scope }) {
  const state = useProgress()
  const openChar = useOpenChar()
  const [queue] = useState(() => buildQueue(scope, load()))
  const [i, setI] = useState(0)
  const [q, setQ] = useState(() => (queue.length ? makeQuestion(queue[0], load()) : null))
  const [showCard, setShowCard] = useState(() => !!(queue.length && queue[0].fresh))
  const [picked, setPicked] = useState(null)
  const [correct, setCorrect] = useState(null)
  const [log, setLog] = useState([])
  const tts = state.settings.tts
  const rate = state.settings.rate

  const advance = useCallback(
    (wasCorrect) => {
      const item = queue[i]
      if (item.type === 'char') gradeChar(item.c, wasCorrect)
      else gradePoem(item.id, wasCorrect)
      logDay('review')
      setLog((l) => [...l, { item, ok: wasCorrect }])
      const n = i + 1
      setI(n)
      setPicked(null)
      setCorrect(null)
      if (n < queue.length) {
        setQ(makeQuestion(queue[n], load()))
        setShowCard(!!queue[n].fresh)
      } else setQ(null)
    },
    [i, queue]
  )

  if (!queue.length) {
    return (
      <div className="page session center">
        <div className="page-head">
          <h1>{scope?.startsWith('write') ? '还没有可以练写的字' : '今天没有要复习的'}</h1>
        </div>
        <p className="muted">{scope ? '先在课本里学几课，或者做一次摸底。' : '学过的字和诗到期后会出现在这里。去学点新的吧。'}</p>
        <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary">
            回首页
          </Link>
          <Link to="/shelf" className="btn">
            去书架
          </Link>
        </div>
      </div>
    )
  }

  if (i >= queue.length) {
    const ok = log.filter((x) => x.ok).length
    const bad = log.filter((x) => !x.ok)
    return (
      <div className="page session center">
        <div className="eyebrow">复习完成</div>
        <div className="summary-num">
          {ok}
          <span className="muted" style={{ fontSize: 28 }}> / {log.length}</span>
        </div>
        <p className="muted">{bad.length ? '答错的会更早回来复习。' : '全对，太棒了！'}</p>
        {bad.length > 0 && (
          <div className="tiles mt" style={{ maxWidth: 480, margin: '16px auto 0' }}>
            {bad.filter((x) => x.item.type === 'char').map((x, k) => (
              <CharTile key={k} c={x.item.c} onClick={() => openChar(x.item.c)} />
            ))}
          </div>
        )}
        <div className="row-wrap mt" style={{ justifyContent: 'center' }}>
          {bad.filter((x) => x.item.type === 'poem').map((x, k) => (
            <Link key={k} to={`/poem/${x.item.id}`} className="btn btn-sm btn-soft">
              再看《{POEM_BY_ID[x.item.id].title}》
            </Link>
          ))}
        </div>
        <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary btn-lg">
            回首页
          </Link>
          {dueChars().length + duePoems().length > 0 && !scope && (
            <a href="#/review" className="btn" onClick={() => setTimeout(() => window.location.reload(), 50)}>
              继续复习剩下的
            </a>
          )}
        </div>
      </div>
    )
  }

  const item = queue[i]
  return (
    <div className="page session">
      <div className="session-top">
        <Link to="/" className="small muted">
          退出
        </Link>
        <Progress value={i} max={queue.length} />
        <span className="small muted">
          {i + 1}/{queue.length}
        </span>
      </div>

      {item.type === 'char' && showCard && (
        <div className="qcard flash">
          <div className="hint">先认一认这个字</div>
          <div className="prompt-py">{CHARS[item.c].py}</div>
          <div className="prompt-char" style={{ fontSize: 120 }}>
            {item.c}
          </div>
          <SpeakButton text={item.c} rate={rate} />
          <div className="words">
            {CHARS[item.c].words.slice(0, 4).map((w) => (
              <button key={w} className="chip" onClick={() => tts && speak(w, { rate })}>
                <span className="py">{wordPy(w)}</span>
                <span className="w">{w}</span>
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setShowCard(false)}>
            记住了，来测一下
          </button>
        </div>
      )}

      {item.type === 'char' && !showCard && q.q === 'py' && (
        <CharPyQuestion q={q} picked={picked} onPick={(opt) => { if (picked) return; const ok = opt === CHARS[q.c].py; setPicked(opt); setCorrect(ok); if (tts) speak(q.c, { rate }) }} onNext={() => advance(correct)} />
      )}
      {item.type === 'char' && !showCard && q.q === 'char' && (
        <CharPickQuestion q={q} picked={picked} rate={rate} onPick={(opt) => { if (picked) return; const ok = opt === q.c; setPicked(opt); setCorrect(ok) }} onNext={() => advance(correct)} />
      )}
      {item.type === 'char' && !showCard && q.q === 'write' && (
        <WriteQuestion key={q.c} q={q} rate={rate} tts={tts} onDone={(ok) => advance(ok)} />
      )}
      {item.type === 'poem' && q.kind === 'cloze' && (
        <ClozeQuestion key={q.id + i} q={q} onDone={(ok) => advance(ok)} rate={rate} tts={tts} />
      )}
      {item.type === 'poem' && q.kind === 'next' && (
        <NextLineQuestion q={q} picked={picked} onPick={(opt) => { if (picked) return; setPicked(opt); setCorrect(opt === q.answer) }} onNext={() => advance(correct)} />
      )}
      {item.type === 'poem' && q.kind === 'title' && (
        <TitleQuestion q={q} picked={picked} onPick={(opt) => { if (picked) return; setPicked(opt); setCorrect(opt === q.answer) }} onNext={() => advance(correct)} />
      )}
    </div>
  )
}

function CharPyQuestion({ q, picked, onPick, onNext }) {
  const right = CHARS[q.c].py
  return (
    <div className="qcard">
      <div className="hint">这个字怎么读？</div>
      <div className="prompt-char">{q.c}</div>
      {picked && q.word && <div className="prompt-word">{q.word}</div>}
      <div className="options">
        {q.options.map((opt) => (
          <button key={opt} className={`opt ${picked ? (opt === right ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => onPick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <div className={`feedback ${picked ? (picked === right ? 'good' : 'bad') : ''}`}>{picked ? (picked === right ? '答对了！' : `读作 ${right}`) : ' '}</div>
      {picked && (
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          继续
        </button>
      )}
    </div>
  )
}

function CharPickQuestion({ q, picked, rate, onPick, onNext }) {
  const info = CHARS[q.c]
  const text = q.word || q.c
  return (
    <div className="qcard">
      <div className="hint">听一听，哪个字是 {info.py}？</div>
      <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
        <div className="prompt-py">{q.word ? wordPy(q.word) : info.py}</div>
        <SpeakButton text={text} rate={rate} />
      </div>
      {q.word && <div className="prompt-word">{[...q.word].map((ch, k) => (ch === q.c ? '＿' : ch)).join('')}</div>}
      <div className="options">
        {q.options.map((opt) => (
          <button key={opt} className={`opt han ${picked ? (opt === q.c ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => onPick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <div className={`feedback ${picked ? (picked === q.c ? 'good' : 'bad') : ''}`}>{picked ? (picked === q.c ? '答对了！' : `是「${q.c}」`) : ' '}</div>
      {picked && (
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          继续
        </button>
      )}
    </div>
  )
}

function WriteQuestion({ q, rate, tts, onDone }) {
  const [result, setResult] = useState(null)
  const info = CHARS[q.c]
  const ok = result ? result.totalMistakes <= 2 : null
  return (
    <div className="qcard">
      <div className="hint">听写：写出这个字</div>
      <div className="row" style={{ justifyContent: 'center', gap: 14 }}>
        <div className="prompt-py">{info.py}</div>
        <SpeakButton text={q.word || q.c} rate={rate} />
      </div>
      {q.word && <div className="prompt-word">{[...q.word].map((ch) => (ch === q.c ? '＿' : ch)).join('')}</div>}
      <div className="mt">
        <Strokes char={q.c} mode="quiz" size={240} onQuizDone={(d) => { setResult(d); logDay('write') }} />
      </div>
      <div className={`feedback ${result ? (ok ? 'good' : 'bad') : ''}`}>{result ? (ok ? '写对了！' : `是「${q.c}」，多练几遍`) : ' '}</div>
      <div className="row-wrap" style={{ justifyContent: 'center' }}>
        {!result && (
          <button className="btn btn-ghost" onClick={() => onDone(false)}>
            不会写，看答案
          </button>
        )}
        {result && (
          <button className="btn btn-primary btn-lg" onClick={() => onDone(ok)}>
            继续
          </button>
        )}
      </div>
    </div>
  )
}

function ClozeQuestion({ q, onDone, rate, tts }) {
  const [step, setStep] = useState(0)
  const [given, setGiven] = useState([])
  const [picked, setPicked] = useState(null)
  const [wrong, setWrong] = useState(false)
  const [options, setOptions] = useState(q.options)
  const p = q.p
  const line = p.lines[q.li]
  const py = p.py[q.li]
  const tokens = lineTokens(line, py)
  const answer = q.answers[step]
  const done = step >= q.answers.length
  const pickOpt = (opt) => {
    if (picked) return
    const ok = opt === answer
    setPicked(opt)
    if (!ok) setWrong(true)
    setTimeout(() => {
      const next = step + 1
      setGiven((g) => [...g, answer])
      setPicked(null)
      if (next < q.answers.length) {
        setStep(next)
        setOptions(clozeOptions(q.answers[next], p))
      } else {
        setStep(next)
        if (tts) speak(line, { rate })
      }
    }, ok ? 500 : 1100)
  }
  return (
    <div className="qcard">
      <div className="hint">
        《{p.title}》· 填上缺的字
      </div>
      <div className={`poem-line ${done ? '' : ''}`} style={{ fontSize: 34, justifyContent: 'center', marginTop: 8 }}>
        {tokens.map((t, k) => {
          const blankIdx = q.chosen.indexOf(k)
          if (blankIdx < 0) return <Ruby key={k} ch={t.ch} py={t.py} className={t.py ? '' : 'punct'} />
          const revealed = blankIdx < given.length
          return <Ruby key={k} ch={t.ch} py={revealed ? t.py : ''} className={`blank ${revealed ? 'reveal' : ''}`} />
        })}
      </div>
      <div className="small muted" style={{ marginTop: 6 }}>
        {q.li > 0 ? `上一句：${p.lines[q.li - 1]}` : `${p.dynasty ? '[' + p.dynasty + '] ' : ''}${p.author}`}
      </div>
      {!done && (
        <div className="options">
          {options.map((opt) => (
            <button key={opt} className={`opt han ${picked ? (opt === answer ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => pickOpt(opt)}>
              {opt}
            </button>
          ))}
        </div>
      )}
      {done && (
        <>
          <div className={`feedback ${wrong ? 'bad' : 'good'}`}>{wrong ? '记住这一句，下次会更早复习到。' : '答对了！'}</div>
          <button className="btn btn-primary btn-lg" onClick={() => onDone(!wrong)}>
            继续
          </button>
        </>
      )}
    </div>
  )
}

function NextLineQuestion({ q, picked, onPick, onNext }) {
  return (
    <div className="qcard">
      <div className="hint">《{q.p.title}》· 下一句是什么？</div>
      <div className="prompt-word" style={{ fontSize: 30 }}>
        {q.prompt}
      </div>
      <div className="options one-col">
        {q.options.map((opt) => (
          <button key={opt} className={`opt line ${picked ? (opt === q.answer ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => onPick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <div className={`feedback ${picked ? (picked === q.answer ? 'good' : 'bad') : ''}`}>{picked ? (picked === q.answer ? '答对了！' : `应该是：${q.answer}`) : ' '}</div>
      {picked && (
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          继续
        </button>
      )}
    </div>
  )
}

function TitleQuestion({ q, picked, onPick, onNext }) {
  return (
    <div className="qcard">
      <div className="hint">这句诗出自哪一首？</div>
      <div className="prompt-word" style={{ fontSize: 30 }}>
        {q.line}
      </div>
      <div className="options">
        {q.options.map((opt) => (
          <button key={opt} className={`opt han ${picked ? (opt === q.answer ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} style={{ fontSize: 22 }} onClick={() => onPick(opt)}>
            {opt}
          </button>
        ))}
      </div>
      <div className={`feedback ${picked ? (picked === q.answer ? 'good' : 'bad') : ''}`}>{picked ? (picked === q.answer ? '答对了！' : `出自《${q.answer}》`) : ' '}</div>
      {picked && (
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          继续
        </button>
      )}
    </div>
  )
}
