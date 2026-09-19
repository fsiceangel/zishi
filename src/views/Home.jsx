import React from 'react'
import { Link, Heatmap, Icon, ProgressMulti } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUME_BY_ID, GRADE_NAMES, KIND_LABEL } from '../lib/data.js'
import { dueChars, duePoems, streak } from '../lib/storage.js'
import { volumeStats, nextLesson, nextPoem, todayCounts } from '../lib/stats.js'

export default function Home() {
  const state = useProgress()
  const v = VOLUME_BY_ID[state.profile.current] || VOLUME_BY_ID['3a']
  const dc = dueChars().length
  const dp = duePoems().length
  const st = volumeStats(v, state)
  const les = nextLesson(v, state)
  const poem = nextPoem(v, state)
  const today = todayCounts(state)
  const doneToday = Object.values(today).reduce((a, b) => a + b, 0)
  const untouched = st.mastered + st.learning + st.weak === 0
  const name = state.profile.name

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
        <h1>{name ? `${name}，今天学点什么？` : '今天学点什么？'}</h1>
      </div>

      <div className="hero">
        <div className="today-card">
          <div className="spread">
            <h2>今日复习</h2>
            <span className="streak">🔥 连续 {streak()} 天</span>
          </div>
          <div className="today-stat">
            <div>
              <b>{dc}</b>
              <span>个字到期</span>
            </div>
            <div>
              <b>{dp}</b>
              <span>首诗到期</span>
            </div>
            <div>
              <b>{doneToday}</b>
              <span>今天已完成</span>
            </div>
          </div>
          {dc + dp > 0 ? (
            <Link to="/review" className="btn btn-primary btn-lg">
              开始复习
            </Link>
          ) : (
            <p className="muted">今天没有到期的复习，去学点新的吧。</p>
          )}
        </div>

        <div className="card">
          <div className="spread">
            <div>
              <div className="eyebrow">当前课本</div>
              <h3 style={{ fontSize: 24 }}>{v.name}</h3>
            </div>
            <Link to={`/book/${v.id}`} className="btn btn-sm btn-ghost">
              打开
            </Link>
          </div>
          <div className="book-bars mt">
            <div className="book-bar">
              <span>识字</span>
              <ProgressMulti parts={[[st.mastered, 'var(--accent)'], [st.learning, 'color-mix(in srgb, var(--accent) 45%, white)']]} max={st.chars} />
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
          {untouched && (
            <p className="small muted mt">这本书还没开始。先做一次<Link to={`/placement/${v.id}`} style={{ color: 'var(--accent-deep)' }}>摸底</Link>，把已经认识的字标出来，复习就只盯着不会的。</p>
          )}
        </div>
      </div>

      <h2 className="section-title">今天的任务</h2>
      <div className="task-list">
        {les ? (
          <Link to={`/learn/${les.id}`} className="task">
            <span className="task-icon">学</span>
            <div>
              <b>
                学新课 · {les.kind === '园地' ? '' : `${KIND_LABEL[les.kind]}${les.num || ''} `}
                {les.title}
              </b>
              <span>
                {les.shizi.length ? `认 ${les.shizi.length} 个字` : ''}
                {les.xiezi.length ? ` · 写 ${les.xiezi.length} 个` : ''}
                {les.poems.length ? ` · ${les.poems.length} 首诗` : ''}
              </span>
            </div>
            <span className="arrow">{Icon.arrow}</span>
          </Link>
        ) : (
          <div className="task">
            <span className="task-icon">✓</span>
            <div>
              <b>{v.name}的课都学完了</b>
              <span>到书架换下一册吧</span>
            </div>
          </div>
        )}
        {poem && (
          <Link to={`/poem/${poem.id}`} className="task">
            <span className="task-icon">诗</span>
            <div>
              <b>背古诗 · {poem.title}</b>
              <span>
                {poem.dynasty ? `[${poem.dynasty}] ` : ''}
                {poem.author} · {poem.lines[0]}
              </span>
            </div>
            <span className="arrow">{Icon.arrow}</span>
          </Link>
        )}
        <Link to={`/review/write:${v.id}`} className="task">
          <span className="task-icon">写</span>
          <div>
            <b>练写字</b>
            <span>{v.short}写字表里学过的字，照笔顺写一写</span>
          </div>
          <span className="arrow">{Icon.arrow}</span>
        </Link>
        <Link to={`/review/vol:${v.id}`} className="task">
          <span className="task-icon">复</span>
          <div>
            <b>巩固本册</b>
            <span>把{v.short}学过的字再过一遍</span>
          </div>
          <span className="arrow">{Icon.arrow}</span>
        </Link>
      </div>

      <div className="card mt-lg">
        <div className="spread">
          <h3 style={{ fontSize: 18 }}>最近 14 周</h3>
          <Link to="/progress" className="small muted">
            看成长记录 →
          </Link>
        </div>
        <div className="mt" style={{ overflowX: 'auto' }}>
          <Heatmap days={state.days} weeks={14} />
        </div>
      </div>

      <p className="small faint mt-lg center">
        {GRADE_NAMES[v.grade]}·{v.term === 1 ? '上' : '下'} · <Link to="/settings">设置</Link>
      </p>
    </div>
  )
}
