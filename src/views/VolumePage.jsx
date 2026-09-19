import React from 'react'
import { Link, Icon, ProgressMulti } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUME_BY_ID, KIND_LABEL, POEM_BY_ID } from '../lib/data.js'
import { setProfile } from '../lib/storage.js'
import { volumeStats } from '../lib/stats.js'
import { stageOf } from '../lib/srs.js'

export default function VolumePage({ id }) {
  const state = useProgress()
  const v = VOLUME_BY_ID[id]
  if (!v) return <div className="page">没有这本书。</div>
  const st = volumeStats(v, state)
  const current = state.profile.current === v.id

  return (
    <div className={`page g${v.grade}`}>
      <div className="page-head">
        <Link to="/shelf" className="small muted">
          ← 书架
        </Link>
        <div className="spread" style={{ alignItems: 'flex-end', marginTop: 6 }}>
          <div>
            <div className="eyebrow">部编版 · {v.short}</div>
            <h1>{v.name}</h1>
          </div>
          <div className="row-wrap">
            {!current && (
              <button className="btn btn-sm btn-ghost" onClick={() => setProfile({ current: v.id })}>
                设为当前课本
              </button>
            )}
            <Link to={`/placement/${v.id}`} className="btn btn-sm">
              摸底
            </Link>
            <Link to={`/review/vol:${v.id}`} className="btn btn-sm btn-primary">
              巩固本册
            </Link>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="book-bars">
          <div className="book-bar">
            <span>识字</span>
            <ProgressMulti parts={[[st.mastered, 'var(--accent)'], [st.learning, 'color-mix(in srgb, var(--accent) 45%, white)'], [st.weak, 'var(--red)']]} max={st.chars} />
            <span>{st.mastered}/{st.chars}</span>
          </div>
          <div className="book-bar">
            <span>写字</span>
            <ProgressMulti parts={[[st.wMastered, 'var(--teal)'], [st.wLearning, 'color-mix(in srgb, var(--teal) 45%, white)']]} max={st.xiezi} />
            <span>{st.wMastered}/{st.xiezi}</span>
          </div>
          <div className="book-bar">
            <span>古诗</span>
            <ProgressMulti parts={[[st.pMastered, 'var(--violet)'], [st.pLearning, 'color-mix(in srgb, var(--violet) 45%, white)']]} max={st.poems} />
            <span>{st.pMastered}/{st.poems}</span>
          </div>
        </div>
        <div className="legend mt">
          <span><i style={{ background: 'var(--accent)' }} />已掌握</span>
          <span><i style={{ background: 'color-mix(in srgb, var(--accent) 45%, white)' }} />学习中</span>
          <span><i style={{ background: 'var(--red)' }} />待巩固</span>
        </div>
      </div>

      {v.units.map((u) => (
        <section key={u.no} className="unit">
          <div className="unit-head">
            <h2>{u.title}</h2>
            {v.grade <= 2 && u.theme && <span className="small faint">{u.theme === '汉语拼音' ? '汉语拼音' : u.theme}</span>}
          </div>
          <div className="lesson-list">
            {u.lessons.map((lid) => {
              const l = v.lessons[lid]
              const known = l.shizi.filter((c) => stageOf(state.chars[c]) === 'mastered').length
              const done = !!state.lessons[lid]
              return (
                <Link key={lid} to={`/lesson/${lid}`} className="lesson-row">
                  <div className="lesson-num">
                    {l.kind === '园地' ? '园' : l.kind === '诵读' ? '诵' : l.num}
                    <small>{l.kind === '园地' ? '园地' : l.kind === '诵读' ? '诵读' : KIND_LABEL[l.kind]}</small>
                  </div>
                  <div>
                    <div className="lesson-title">
                      {l.title}
                      {l.star && <span className="faint small"> *</span>}
                    </div>
                    <div className="lesson-sub">
                      {l.shizi.length > 0 && <span>认 {known}/{l.shizi.length}</span>}
                      {l.xiezi.length > 0 && <span>写 {l.xiezi.length}</span>}
                      {l.words.length > 0 && <span>词 {l.words.length}</span>}
                      {l.poems.length > 0 && <span>诗 {l.poems.map((p) => POEM_BY_ID[p].title).join('、')}</span>}
                    </div>
                  </div>
                  <span className={done ? 'lesson-done' : 'faint'}>{done ? '已学' : Icon.arrow}</span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
