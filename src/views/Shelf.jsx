import React from 'react'
import { Link, ProgressMulti } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUMES, GRADE_NAMES } from '../lib/data.js'
import { setProfile } from '../lib/storage.js'
import { volumeStats } from '../lib/stats.js'

export default function Shelf() {
  const state = useProgress()
  const grades = [1, 2, 3, 4, 5, 6]
  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">部编版语文 · 十二册</div>
        <h1>书架</h1>
        <p className="lede">每一册的识字表、写字表和古诗词都在这里。当前课本决定"今日"页的任务。</p>
      </div>
      {grades.map((g) => (
        <section key={g} className={`shelf-grade g${g}`}>
          <h2>
            {GRADE_NAMES[g]} <span className="count small faint">{g <= 2 ? '识字打基础' : g <= 4 ? '识字与阅读' : '古诗文加量'}</span>
          </h2>
          <div className="grid-2">
            {VOLUMES.filter((v) => v.grade === g).map((v) => {
              const st = volumeStats(v, state)
              const current = state.profile.current === v.id
              return (
                <div key={v.id} className={`card book-card ${current ? 'current' : ''}`}>
                  <div className="spread">
                    <h3>{v.name}</h3>
                    {current ? (
                      <span className="pill pill-accent">当前</span>
                    ) : (
                      <button className="btn btn-sm btn-ghost" onClick={() => setProfile({ current: v.id })}>
                        设为当前
                      </button>
                    )}
                  </div>
                  <div className="book-meta">
                    <span>识字 {st.chars}</span>
                    <span>写字 {st.xiezi}</span>
                    <span>古诗 {st.poems}</span>
                    <span>{st.lessonsDone}/{st.lessons} 课</span>
                  </div>
                  <div className="book-bars">
                    <div className="book-bar">
                      <span>识字</span>
                      <ProgressMulti parts={[[st.mastered, 'var(--accent)'], [st.learning, 'color-mix(in srgb, var(--accent) 45%, white)'], [st.weak, 'var(--red)']]} max={st.chars} />
                      <span>{st.chars ? Math.round((st.mastered / st.chars) * 100) : 0}%</span>
                    </div>
                    <div className="book-bar">
                      <span>写字</span>
                      <ProgressMulti parts={[[st.wMastered, 'var(--teal)'], [st.wLearning, 'color-mix(in srgb, var(--teal) 45%, white)']]} max={st.xiezi} />
                      <span>{st.xiezi ? Math.round((st.wMastered / st.xiezi) * 100) : 0}%</span>
                    </div>
                    <div className="book-bar">
                      <span>古诗</span>
                      <ProgressMulti parts={[[st.pMastered, 'var(--violet)'], [st.pLearning, 'color-mix(in srgb, var(--violet) 45%, white)']]} max={st.poems} />
                      <span>{st.pMastered}/{st.poems}</span>
                    </div>
                  </div>
                  <div className="row-wrap" style={{ marginTop: 4 }}>
                    <Link to={`/book/${v.id}`} className="btn btn-sm btn-primary">
                      进入课本
                    </Link>
                    <Link to={`/placement/${v.id}`} className="btn btn-sm">
                      摸底
                    </Link>
                    <Link to={`/review/vol:${v.id}`} className="btn btn-sm">
                      巩固
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
