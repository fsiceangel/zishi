import React, { useMemo, useState, useEffect } from 'react'
import { Link, Progress, CharTile, SpeakButton } from '../components/ui.jsx'
import { useProgress, useOpenChar } from '../App.jsx'
import { LESSON_BY_ID, volumeOfLesson, CHARS, wordPy, POEM_BY_ID, KIND_LABEL } from '../lib/data.js'
import { pinyinOptions, shuffle, contextWord } from '../lib/quiz.js'
import { learnChars, setCharKnown, markLessonLearned, logDay, gradeChar } from '../lib/storage.js'
import { stageOf } from '../lib/srs.js'
import { speak } from '../lib/tts.js'

// Learn a lesson: flashcards for its 识字 characters, then a pinyin check for each.
export default function LearnSession({ id, mode }) {
  const state = useProgress()
  const openChar = useOpenChar()
  const l = LESSON_BY_ID[id]
  const v = l ? volumeOfLesson(id) : null
  const quizOnly = mode === 'quiz'
  const [skipMastered, setSkipMastered] = useState(true)
  const allChars = useMemo(() => (l ? [...new Set(l.shizi)] : []), [l])
  const [phase, setPhase] = useState('intro') // intro | card | quiz | done
  const [cards, setCards] = useState([])
  const [i, setI] = useState(0)
  const [queue, setQueue] = useState([])
  const [q, setQ] = useState(null)
  const [picked, setPicked] = useState(null)
  const [results, setResults] = useState({})
  const [retried, setRetried] = useState(new Set())

  if (!l) return <div className="page">没有这一课。</div>
  const tts = state.settings.tts
  const rate = state.settings.rate

  const start = () => {
    const list = quizOnly || !skipMastered ? allChars : allChars.filter((c) => stageOf(state.chars[c]) !== 'mastered')
    const target = list.length ? list : allChars
    setCards(target)
    setResults({})
    setRetried(new Set())
    setI(0)
    if (quizOnly) startQuiz(target)
    else {
      setPhase('card')
      if (tts) setTimeout(() => speak(target[0], { rate }), 300)
    }
  }
  const startQuiz = (list) => {
    const qs = shuffle(list)
    setQueue(qs)
    setQ({ c: qs[0], options: pinyinOptions(qs[0]), word: contextWord(qs[0]) })
    setPicked(null)
    setPhase('quiz')
  }
  const nextCard = () => {
    if (i + 1 < cards.length) {
      setI(i + 1)
      if (tts) speak(cards[i + 1], { rate })
    } else startQuiz(cards)
  }
  const answer = (opt) => {
    if (picked) return
    const correct = opt === CHARS[q.c].py
    setPicked(opt)
    if (tts) speak(q.c, { rate })
    setResults((r) => ({ ...r, [q.c]: r[q.c] === false ? false : correct }))
    if (!correct && !retried.has(q.c)) {
      setRetried((s) => new Set(s).add(q.c))
      setQueue((qq) => [...qq, q.c])
    }
  }
  const nextQ = () => {
    const rest = queue.slice(1)
    if (rest.length) {
      setQueue(rest)
      setQ({ c: rest[0], options: pinyinOptions(rest[0]), word: contextWord(rest[0]) })
      setPicked(null)
    } else finish()
  }
  const finish = () => {
    const ok = cards.filter((c) => results[c] !== false)
    const bad = cards.filter((c) => results[c] === false)
    if (quizOnly) {
      for (const c of cards) gradeChar(c, results[c] !== false)
    } else {
      learnChars(ok)
      for (const c of bad) setCharKnown(c, false)
      markLessonLearned(id)
    }
    logDay(quizOnly ? 'review' : 'learn', cards.length)
    setPhase('done')
  }

  const total = cards.length
  const answered = total - queue.length + (picked ? 1 : 0)

  return (
    <div className={`page session g${v.grade}`}>
      {phase === 'intro' && (
        <div>
          <Link to={`/lesson/${id}`} className="small muted">
            ← {l.title}
          </Link>
          <div className="page-head" style={{ marginTop: 6 }}>
            <div className="eyebrow">
              {v.short} · {l.kind === '园地' ? '语文园地' : `${KIND_LABEL[l.kind]} ${l.num || ''}`}
            </div>
            <h1>{quizOnly ? '测一测' : '学习'}：{l.title}</h1>
          </div>
          {allChars.length > 0 ? (
            <>
              <p className="muted">
                {quizOnly ? `这一课有 ${allChars.length} 个字，每个字选出正确的拼音。` : `先一个一个认识 ${allChars.length} 个生字，再做一遍拼音小测。答对的字进入复习计划，答错的今天再来一次。`}
              </p>
              <div className="tiles mt">
                {allChars.map((c) => (
                  <CharTile key={c} c={c} write={l.xiezi.includes(c)} onClick={() => openChar(c)} />
                ))}
              </div>
              {!quizOnly && allChars.some((c) => stageOf(state.chars[c]) === 'mastered') && (
                <label className="row mt small muted" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={skipMastered} onChange={(e) => setSkipMastered(e.target.checked)} /> 跳过已经掌握的字
                </label>
              )}
              <div className="mt-lg">
                <button className="btn btn-primary btn-lg" onClick={start}>
                  开始
                </button>
              </div>
            </>
          ) : (
            <p className="muted">这一课没有生字。</p>
          )}
          {l.poems.length > 0 && (
            <div className="card card-soft mt-lg">
              这一课还有古诗：
              {l.poems.map((pid) => (
                <Link key={pid} to={`/poem/${pid}`} className="btn btn-sm btn-ink" style={{ marginLeft: 8 }}>
                  {POEM_BY_ID[pid].title}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {phase === 'card' && (
        <div>
          <div className="session-top">
            <Link to={`/lesson/${id}`} className="small muted">
              退出
            </Link>
            <Progress value={i} max={cards.length} />
            <span className="small muted">
              {i + 1}/{cards.length}
            </span>
          </div>
          <Flashcard c={cards[i]} write={l.xiezi.includes(cards[i])} rate={rate} tts={tts} onStrokes={() => openChar(cards[i])} />
          <div className="row mt-lg" style={{ justifyContent: 'center', gap: 12 }}>
            {i > 0 && (
              <button className="btn" onClick={() => setI(i - 1)}>
                上一个
              </button>
            )}
            <button className="btn btn-primary btn-lg" onClick={nextCard}>
              {i + 1 < cards.length ? '记住了，下一个' : '都看完了，开始小测'}
            </button>
          </div>
        </div>
      )}

      {phase === 'quiz' && q && (
        <div>
          <div className="session-top">
            <Link to={`/lesson/${id}`} className="small muted">
              退出
            </Link>
            <Progress value={answered} max={total + retried.size} />
            <span className="small muted">
              {Math.min(answered, total + retried.size)}/{total + retried.size}
            </span>
          </div>
          <div className="qcard">
            <div className="hint">这个字怎么读？</div>
            <div className="prompt-char">{q.c}</div>
            {q.word && picked && <div className="prompt-word">{q.word}</div>}
            <div className="options">
              {q.options.map((opt) => {
                const isRight = opt === CHARS[q.c].py
                const cls = picked ? (isRight ? 'right' : opt === picked ? 'wrong' : 'dim') : ''
                return (
                  <button key={opt} className={`opt ${cls}`} onClick={() => answer(opt)}>
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className={`feedback ${picked ? (picked === CHARS[q.c].py ? 'good' : 'bad') : ''}`}>
              {picked ? (picked === CHARS[q.c].py ? '答对了！' : `读作 ${CHARS[q.c].py}${q.word ? ' · ' + q.word : ''}`) : ' '}
            </div>
            {picked && (
              <button className="btn btn-primary btn-lg" onClick={nextQ}>
                继续
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'done' && (
        <Summary l={l} cards={cards} results={results} quizOnly={quizOnly} openChar={openChar} onRestart={start} />
      )}
    </div>
  )
}

function Flashcard({ c, write, rate, tts, onStrokes }) {
  const info = CHARS[c]
  return (
    <div className="qcard flash">
      <div className="prompt-py">{info.py}</div>
      <div className="prompt-char" style={{ fontSize: 120 }}>
        {c}
      </div>
      <div className="row">
        <SpeakButton text={c} rate={rate} />
        {write && <span className="pill pill-accent">要会写</span>}
        {info.readings.length > 1 && <span className="pill">又读 {info.readings.slice(1).map((r) => r.py).join('、')}</span>}
      </div>
      <div className="words">
        {info.words.slice(0, 4).map((w) => (
          <button key={w} className="chip" onClick={() => tts && speak(w, { rate })}>
            <span className="py">{wordPy(w)}</span>
            <span className="w">{w}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-sm btn-ghost" onClick={onStrokes}>
        看笔顺 / 组词详情
      </button>
    </div>
  )
}

function Summary({ l, cards, results, quizOnly, openChar, onRestart }) {
  const bad = cards.filter((c) => results[c] === false)
  const ok = cards.length - bad.length
  return (
    <div className="center">
      <div className="eyebrow">{quizOnly ? '测一测' : '学完了'}</div>
      <div className="summary-num">
        {ok}
        <span className="muted" style={{ fontSize: 28 }}> / {cards.length}</span>
      </div>
      <p className="muted">{bad.length === 0 ? '全部答对，明天再来复习一遍。' : `${bad.length} 个字还要再看看，它们会出现在今天的复习里。`}</p>
      {bad.length > 0 && (
        <div className="tiles mt" style={{ maxWidth: 420, margin: '16px auto 0' }}>
          {bad.map((c) => (
            <CharTile key={c} c={c} onClick={() => openChar(c)} />
          ))}
        </div>
      )}
      <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
        {bad.length > 0 && (
          <button className="btn" onClick={onRestart}>
            再来一遍
          </button>
        )}
        {l.xiezi.length > 0 && (
          <Link to={`/review/write:${l.id}`} className="btn">
            练写这课的字
          </Link>
        )}
        {l.poems.map((pid) => (
          <Link key={pid} to={`/poem/${pid}`} className="btn btn-soft">
            背《{POEM_BY_ID[pid].title}》
          </Link>
        ))}
        <Link to={`/book/${l.id.slice(0, 2)}`} className="btn btn-primary">
          回到课本
        </Link>
      </div>
    </div>
  )
}
