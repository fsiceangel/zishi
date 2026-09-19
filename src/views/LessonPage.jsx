import React from 'react'
import { Link, CharTile, SpeakButton } from '../components/ui.jsx'
import { useProgress, useOpenChar } from '../App.jsx'
import { LESSON_BY_ID, volumeOfLesson, KIND_LABEL, POEM_BY_ID, wordPy, CHARS } from '../lib/data.js'
import { stageOf } from '../lib/srs.js'
import { speak } from '../lib/tts.js'

export default function LessonPage({ id }) {
  const state = useProgress()
  const openChar = useOpenChar()
  const l = LESSON_BY_ID[id]
  if (!l) return <div className="page">没有这一课。</div>
  const v = volumeOfLesson(id)
  const unit = v.units.find((u) => u.no === l.unit)
  const oldWrite = l.xiezi.filter((c) => !l.shizi.includes(c))
  const known = l.shizi.filter((c) => stageOf(state.chars[c]) === 'mastered').length
  const done = !!state.lessons[id]

  return (
    <div className={`page g${v.grade}`}>
      <div className="page-head">
        <Link to={`/book/${v.id}`} className="small muted">
          ← {v.name}
        </Link>
        <div className="eyebrow" style={{ marginTop: 6 }}>
          {unit?.title} · {l.kind === '园地' ? '语文园地' : l.kind === '诵读' ? '古诗词诵读' : `${KIND_LABEL[l.kind]} ${l.num}`}
          {l.page ? ` · 第 ${l.page} 页` : ''}
        </div>
        <h1>{l.title}</h1>
        <div className="row-wrap mt">
          {(l.shizi.length > 0 || l.poems.length > 0) && (
            <Link to={`/learn/${id}`} className="btn btn-primary">
              {done ? '再学一遍' : '学习这一课'}
            </Link>
          )}
          {l.shizi.length > 0 && (
            <Link to={`/learn/${id}/quiz`} className="btn">
              测一测
            </Link>
          )}
          {l.xiezi.length > 0 && (
            <Link to={`/review/write:${id}`} className="btn">
              练写字
            </Link>
          )}
          {done && <span className="pill pill-green">已学 · 掌握 {known}/{l.shizi.length}</span>}
        </div>
      </div>

      {l.poems.length > 0 && (
        <>
          <h2 className="section-title">
            古诗 <span className="count">{l.poems.length} 首</span>
          </h2>
          <div className="grid-2">
            {l.poems.map((pid) => {
              const p = POEM_BY_ID[pid]
              const st = stageOf(state.poems[pid])
              return (
                <Link key={pid} to={`/poem/${pid}`} className="card card-link poem-card">
                  <div className="grow">
                    <div className="spread">
                      <h3 style={{ fontSize: 22 }}>{p.title}</h3>
                      <span className={`pill ${st === 'mastered' ? 'pill-green' : st === 'new' ? '' : 'pill-amber'}`}>{st === 'mastered' ? '会背' : st === 'new' ? '未学' : '在背'}</span>
                    </div>
                    <div className="small muted">
                      {p.dynasty ? `[${p.dynasty}] ` : ''}
                      {p.author}
                    </div>
                    <div className="first mt" style={{ marginTop: 6 }}>
                      {p.lines[0]}
                      {p.lines[1] || ''}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

      {l.shizi.length > 0 && (
        <>
          <h2 className="section-title">
            会认的字 <span className="count">{l.shizi.length} 个 · 点一个字看详情</span>
          </h2>
          <div className="tiles">
            {l.shizi.map((c, i) => (
              <CharTile key={c + i} c={c} write={l.xiezi.includes(c)} onClick={() => openChar(c)} />
            ))}
          </div>
        </>
      )}

      {oldWrite.length > 0 && (
        <>
          <h2 className="section-title">
            会写的字 <span className="count">这一课要求会写、以前学过认的 {oldWrite.length} 个</span>
          </h2>
          <div className="tiles">
            {oldWrite.map((c) => (
              <CharTile key={c} c={c} write onClick={() => openChar(c)} />
            ))}
          </div>
        </>
      )}

      {l.duoyin.length > 0 && (
        <>
          <h2 className="section-title">
            多音字 <span className="count">这一课里换了读音的字</span>
          </h2>
          <div className="chips">
            {l.duoyin.map((d, i) => (
              <button key={i} className="chip" onClick={() => openChar(d.c)}>
                <span className="py">{d.py}</span>
                <span className="w">{d.c}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {l.words.length > 0 && (
        <>
          <h2 className="section-title">
            词语表 <span className="count">{l.words.length} 个 · 点一下听读音</span>
          </h2>
          <div className="chips">
            {l.words.map((w) => (
              <button key={w} className="chip" onClick={() => state.settings.tts && speak(w, { rate: state.settings.rate })}>
                <span className="py">{state.settings.pinyin ? wordPy(w) : ' '}</span>
                <span className="w">{w}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {l.shizi.length === 0 && l.poems.length === 0 && oldWrite.length === 0 && (
        <p className="muted mt">这一课没有生字表内容。</p>
      )}
    </div>
  )
}
