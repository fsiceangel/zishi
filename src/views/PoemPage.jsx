import React, { useState, useEffect, useRef } from 'react'
import { Link, Ruby, Icon } from '../components/ui.jsx'
import { useProgress, useOpenChar } from '../App.jsx'
import { POEM_BY_ID, LESSON_BY_ID, volumeOfLesson, lineTokens, lessonLabel, CHARS } from '../lib/data.js'
import { poemCloze, clozeOptions, nextLineQuestion, shuffle } from '../lib/quiz.js'
import { learnPoem, gradePoem, logDay } from '../lib/storage.js'
import { stageOf, STAGE_LABEL, dayNumber } from '../lib/srs.js'
import { speak, stop } from '../lib/tts.js'

export default function PoemPage({ id }) {
  const state = useProgress()
  const openChar = useOpenChar()
  const p = POEM_BY_ID[id]
  const [mode, setMode] = useState('read')
  const [showPy, setShowPy] = useState(state.settings.pinyin)
  const [active, setActive] = useState(-1)
  useEffect(() => () => stop(), [])
  if (!p) return <div className="page">没有这首诗。</div>
  const v = volumeOfLesson(p.lesson)
  const e = state.poems[id]
  const stage = stageOf(e)
  const tts = state.settings.tts
  const rate = state.settings.rate

  const readAll = () => {
    if (!tts) return
    let k = 0
    const next = () => {
      if (k >= p.lines.length) {
        setActive(-1)
        return
      }
      setActive(k)
      speak(p.lines[k], { rate: Math.min(rate, 0.85), onEnd: () => { k++; setTimeout(next, 250) } })
    }
    next()
  }

  return (
    <div className={`page page-narrow g${v.grade}`}>
      <Link to={`/lesson/${p.lesson}`} className="small muted">
        ← {lessonLabel(p.lesson)}
      </Link>
      <div className="poem mt">
        <div className="eyebrow">
          {p.src === '园地' ? '日积月累' : p.src === '诵读' ? '古诗词诵读' : '课文'} · {p.type === '词' ? '词' : '诗'}
        </div>
        <h1>{p.title}</h1>
        {showPy && <div className="small faint">{p.titlePy}</div>}
        <div className="author">
          {p.dynasty ? `[${p.dynasty}] ` : ''}
          {p.author}
          {showPy && p.authorPy ? <span className="faint"> · {p.authorPy}</span> : ''}
        </div>
        <div className="recite-controls">
          <div className="seg">
            <button className={mode === 'read' ? 'on' : ''} onClick={() => setMode('read')}>读</button>
            <button className={mode === 'recite' ? 'on' : ''} onClick={() => setMode('recite')}>背</button>
            <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>练</button>
          </div>
          <button className={`btn btn-sm ${showPy ? '' : 'btn-ghost'}`} onClick={() => setShowPy(!showPy)}>
            拼音{showPy ? '开' : '关'}
          </button>
          {tts && (
            <button className="btn btn-sm" onClick={readAll}>
              朗读全文
            </button>
          )}
        </div>

        {mode === 'read' && (
          <ReadMode p={p} showPy={showPy} active={active} tts={tts} rate={rate} openChar={openChar} onLine={(k) => { setActive(k); tts && speak(p.lines[k], { rate: Math.min(rate, 0.85), onEnd: () => setActive(-1) }) }} />
        )}
        {mode === 'recite' && <ReciteMode p={p} showPy={showPy} tts={tts} rate={rate} onResult={(ok) => { if (e) gradePoem(id, ok); else learnPoem(id); logDay('poem') }} />}
        {mode === 'quiz' && <QuizMode key={id} p={p} onFinish={(score, total) => { const ok = score >= Math.ceil(total * 0.8); if (e) gradePoem(id, ok); else learnPoem(id); logDay('poem') }} />}
      </div>

      <div className="card mt-lg">
        <div className="spread">
          <div>
            <span className={`pill ${stage === 'mastered' ? 'pill-green' : stage === 'new' ? '' : 'pill-amber'}`}>{stage === 'mastered' ? '会背了' : stage === 'new' ? '还没开始背' : '正在背'}</span>
            {e && e.due != null && <span className="small faint" style={{ marginLeft: 8 }}>{e.due - dayNumber() <= 0 ? '今天该复习' : `${e.due - dayNumber()} 天后复习`} · 第 {e.box} 箱</span>}
          </div>
          {stage === 'new' && (
            <button className="btn btn-sm btn-soft" onClick={() => { learnPoem(id); logDay('poem') }}>
              开始背这首
            </button>
          )}
        </div>
        <p className="small muted mt">
          先在「读」里跟着读几遍，到「背」里把字藏起来试着背，最后在「练」里做几道填空。背出来后它会进入复习计划，隔 1、2、4、7、15 天再来考你。
        </p>
      </div>
    </div>
  )
}

function ReadMode({ p, showPy, active, onLine, openChar }) {
  return (
    <div className={`poem-lines ${showPy ? '' : 'nopy'}`}>
      {p.preface && <div className="poem-preface">{p.preface}</div>}
      {p.lines.map((line, k) => (
        <div key={k} className={`poem-line ${active === k ? 'active' : ''}`} onClick={() => onLine(k)} style={{ cursor: 'pointer' }}>
          {lineTokens(line, p.py[k]).map((t, j) => (
            <Ruby key={j} ch={t.ch} py={t.py} className={t.py ? '' : 'punct'} />
          ))}
        </div>
      ))}
    </div>
  )
}

// progressively hide: level 0 all, 1 first char of each line, 2 nothing; tap a line to reveal it
function ReciteMode({ p, showPy, tts, rate, onResult }) {
  const [level, setLevel] = useState(1)
  const [revealed, setRevealed] = useState(new Set())
  const [judged, setJudged] = useState(false)
  useEffect(() => {
    setRevealed(new Set())
  }, [level])
  return (
    <div>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={level === 0 ? 'on' : ''} onClick={() => setLevel(0)}>全显示</button>
        <button className={level === 1 ? 'on' : ''} onClick={() => setLevel(1)}>只留第一个字</button>
        <button className={level === 2 ? 'on' : ''} onClick={() => setLevel(2)}>全藏起来</button>
      </div>
      <div className={`poem-lines ${showPy ? '' : 'nopy'}`}>
        {p.lines.map((line, k) => {
          const show = level === 0 || revealed.has(k)
          const tokens = lineTokens(line, p.py[k])
          return (
            <div key={k} className="poem-line" style={{ cursor: 'pointer' }} onClick={() => { setRevealed((s) => new Set(s).add(k)); if (tts) speak(line, { rate }) }}>
              {tokens.map((t, j) => {
                const firstCjk = tokens.findIndex((x) => x.py)
                const visible = show || (level === 1 && j === firstCjk) || !t.py
                return <Ruby key={j} ch={t.ch} py={visible ? t.py : ''} className={`${visible ? '' : 'hidden'} ${t.py ? '' : 'punct'}`} />
              })}
            </div>
          )
        })}
      </div>
      <p className="small muted mt">点一句可以偷看那一句。试着把整首背出来，再诚实地点下面的按钮。</p>
      {!judged ? (
        <div className="row-wrap mt" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => { setJudged(true); onResult(true) }}>
            我背下来了
          </button>
          <button className="btn btn-ghost" onClick={() => { setJudged(true); onResult(false) }}>
            还背不出
          </button>
        </div>
      ) : (
        <p className="small center mt" style={{ color: 'var(--green-deep)' }}>记下了，复习计划已更新。</p>
      )}
    </div>
  )
}

function QuizMode({ p, onFinish }) {
  const [qs] = useState(() => {
    const list = []
    for (let k = 0; k < 4; k++) {
      const cl = poemCloze(p, k >= 2 ? 2 : 1)
      list.push({ kind: 'cloze', ...cl })
    }
    const nq = nextLineQuestion(p)
    if (nq) list.push({ kind: 'next', ...nq })
    return shuffle(list)
  })
  const [i, setI] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const done = (ok) => {
    const s = score + (ok ? 1 : 0)
    setScore(s)
    if (i + 1 < qs.length) setI(i + 1)
    else {
      setFinished(true)
      onFinish(s, qs.length)
    }
  }
  if (finished)
    return (
      <div className="card center">
        <div className="summary-num">
          {score}
          <span className="muted" style={{ fontSize: 24 }}> / {qs.length}</span>
        </div>
        <p className="muted">{score >= Math.ceil(qs.length * 0.8) ? '很熟了！' : '再读几遍，明天再练。'}</p>
      </div>
    )
  const q = qs[i]
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 8 }}>
        第 {i + 1} / {qs.length} 题
      </div>
      {q.kind === 'cloze' ? <MiniCloze key={i} p={p} q={q} onDone={done} /> : <MiniNext key={i} q={q} onDone={done} />}
    </div>
  )
}

function MiniCloze({ p, q, onDone }) {
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState(null)
  const [wrong, setWrong] = useState(false)
  const [options, setOptions] = useState(() => clozeOptions(q.answers[0], p))
  const line = p.lines[q.li]
  const tokens = lineTokens(line, p.py[q.li])
  const answer = q.answers[step]
  const finished = step >= q.answers.length
  const pickOpt = (opt) => {
    if (picked) return
    const ok = opt === answer
    setPicked(opt)
    if (!ok) setWrong(true)
    setTimeout(() => {
      const n = step + 1
      setPicked(null)
      setStep(n)
      if (n < q.answers.length) setOptions(clozeOptions(q.answers[n], p))
    }, ok ? 450 : 1000)
  }
  return (
    <div className="qcard">
      <div className="poem-line" style={{ fontSize: 32, justifyContent: 'center' }}>
        {tokens.map((t, k) => {
          const b = q.chosen.indexOf(k)
          if (b < 0) return <Ruby key={k} ch={t.ch} py={t.py} className={t.py ? '' : 'punct'} />
          const rev = b < step
          return <Ruby key={k} ch={t.ch} py={rev ? t.py : ''} className={`blank ${rev ? 'reveal' : ''}`} />
        })}
      </div>
      {!finished ? (
        <div className="options">
          {options.map((opt) => (
            <button key={opt} className={`opt han ${picked ? (opt === answer ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => pickOpt(opt)}>
              {opt}
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className={`feedback ${wrong ? 'bad' : 'good'}`}>{wrong ? '记住这一句。' : '答对了！'}</div>
          <button className="btn btn-primary" onClick={() => onDone(!wrong)}>
            下一题
          </button>
        </>
      )}
    </div>
  )
}

function MiniNext({ q, onDone }) {
  const [picked, setPicked] = useState(null)
  return (
    <div className="qcard">
      <div className="hint">下一句是什么？</div>
      <div className="prompt-word" style={{ fontSize: 28 }}>{q.prompt}</div>
      <div className="options one-col">
        {q.options.map((opt) => (
          <button key={opt} className={`opt line ${picked ? (opt === q.answer ? 'right' : opt === picked ? 'wrong' : 'dim') : ''}`} onClick={() => !picked && setPicked(opt)}>
            {opt}
          </button>
        ))}
      </div>
      {picked && (
        <button className="btn btn-primary mt" onClick={() => onDone(picked === q.answer)}>
          下一题
        </button>
      )}
    </div>
  )
}
