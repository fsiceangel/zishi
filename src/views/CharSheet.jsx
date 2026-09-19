import React, { useState, useEffect, Suspense } from 'react'
import { Sheet, SpeakButton, Link } from '../components/ui.jsx'
import { lazyWithReload, ErrorBoundary } from '../lib/lazy.jsx'
const Strokes = lazyWithReload(() => import('../components/Strokes.jsx'), 'strokes')
import { useProgress } from '../App.jsx'
import { CHARS, LESSON_BY_ID, lessonLabel, wordPy } from '../lib/data.js'
import { stageOf, STAGE_LABEL, INTERVALS, dayNumber } from '../lib/srs.js'
import { setCharKnown, logDay } from '../lib/storage.js'
import { speak } from '../lib/tts.js'

export default function CharSheet({ c, onClose }) {
  const state = useProgress()
  const [mode, setMode] = useState('show')
  useEffect(() => setMode('show'), [c])
  if (!c) return null
  const info = CHARS[c]
  if (!info) return null
  const e = state.chars[c]
  const stage = stageOf(e)
  const dueIn = e && e.due != null ? e.due - dayNumber() : null
  const writeLesson = info.write ? LESSON_BY_ID[info.write] : null

  return (
    <Sheet open={!!c} onClose={onClose} title="">
      <div className="char-hero">
        <div className="char-big">
          <span className="py">{info.py}</span>
          {c}
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <div className="row">
            <span className="readings">
              {info.py}
              {info.readings.length > 1 && (
                <small>
                  {' '}
                  · 又读 {info.readings.slice(1).map((r) => r.py).join('、')}
                </small>
              )}
            </span>
            <SpeakButton text={c} rate={state.settings.rate} />
          </div>
          <div className="meta-line">
            会认：<Link to={`/lesson/${info.first}`} onClick={onClose}>{lessonLabel(info.first)}</Link>
            {info.again?.map((lid) => (
              <span key={lid}>、<Link to={`/lesson/${lid}`} onClick={onClose}>{lessonLabel(lid)}</Link></span>
            ))}
          </div>
          <div className="meta-line">
            {writeLesson ? (
              <>
                会写：<Link to={`/lesson/${info.write}`} onClick={onClose}>{lessonLabel(info.write)}</Link>
              </>
            ) : (
              '小学阶段只要求会认'
            )}
          </div>
          <div className="row-wrap">
            <span className={`pill ${stage === 'mastered' ? 'pill-green' : stage === 'weak' ? 'pill-red' : stage === 'learning' ? 'pill-amber' : ''}`}>{STAGE_LABEL[stage]}</span>
            {e && e.box != null && <span className="small faint">第 {e.box} 箱 · {dueIn <= 0 ? '今天复习' : `${dueIn} 天后复习`} · 答对 {e.ok || 0} / 答错 {e.miss || 0}</span>}
          </div>
        </div>
      </div>

      {info.readings.length > 1 && (
        <p className="small muted mt">
          {info.readings.slice(1).map((r) => (
            <span key={r.py + r.lesson}>
              读 {r.py} 见 {lessonLabel(r.lesson)}；
            </span>
          ))}
        </p>
      )}

      {info.words.length > 0 && (
        <div className="chips mt">
          {info.words.map((w) => (
            <button key={w} className="chip" onClick={() => state.settings.tts && speak(w, { rate: state.settings.rate })}>
              <span className="py">{wordPy(w)}</span>
              <span className="w">{w}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-lg">
        <div className="seg" style={{ marginBottom: 12 }}>
          <button className={mode === 'show' ? 'on' : ''} onClick={() => setMode('show')}>
            笔顺
          </button>
          <button className={mode === 'quiz' ? 'on' : ''} onClick={() => setMode('quiz')}>
            我来写
          </button>
        </div>
        <ErrorBoundary><Suspense fallback={<div className="strokes-hint">笔顺加载中…</div>}>
          <Strokes
          char={c}
          mode={mode}
          size={220}
          onQuizDone={(d) => {
            logDay('write')
          }}
        />
        </Suspense></ErrorBoundary>
      </div>

      <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
        <button
          className="btn btn-soft"
          onClick={() => {
            setCharKnown(c, true)
          }}
        >
          我认识
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            setCharKnown(c, false)
          }}
        >
          还不认识，多复习
        </button>
      </div>
    </Sheet>
  )
}
