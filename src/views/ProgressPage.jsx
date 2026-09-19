import React from 'react'
import { Link, Heatmap, ProgressMulti } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUMES } from '../lib/data.js'
import { overall, volumeStats } from '../lib/stats.js'
import { streak } from '../lib/storage.js'
import { INTERVALS } from '../lib/srs.js'

export default function ProgressPage() {
  const state = useProgress()
  const o = overall(state)
  const boxes = Array(INTERVALS.length).fill(0)
  for (const e of Object.values(state.chars)) if (e.box != null) boxes[e.box]++
  const activeDays = Object.keys(state.days).length
  const recent = Object.entries(state.days).sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 10)

  return (
    <div className="page">
      <div className="page-head">
        <div className="eyebrow">成长记录</div>
        <h1>{state.profile.name ? `${state.profile.name}的进度` : '我的进度'}</h1>
      </div>
      <div className="stat-row">
        <div className="stat">
          <b>{o.mastered}</b>
          <span>掌握的字 / {o.chars}</span>
        </div>
        <div className="stat">
          <b>{o.learning}</b>
          <span>学习中的字</span>
        </div>
        <div className="stat">
          <b>{o.pMastered}</b>
          <span>会背的诗 / {o.poems}</span>
        </div>
        <div className="stat">
          <b>{streak()}</b>
          <span>连续天数 · 共 {activeDays} 天</span>
        </div>
      </div>

      <div className="card mt">
        <h3 style={{ fontSize: 18 }}>最近 20 周</h3>
        <div className="mt" style={{ overflowX: 'auto' }}>
          <Heatmap days={state.days} weeks={20} />
        </div>
      </div>

      <h2 className="section-title">每一册</h2>
      <div className="stack">
        {VOLUMES.map((v) => {
          const st = volumeStats(v, state)
          return (
            <Link key={v.id} to={`/book/${v.id}`} className={`card card-link g${v.grade}`} style={{ padding: '12px 16px' }}>
              <div className="spread">
                <b className="han" style={{ fontSize: 18 }}>{v.name}</b>
                <span className="small muted">
                  识字 {st.mastered}/{st.chars} · 写字 {st.wMastered}/{st.xiezi} · 古诗 {st.pMastered}/{st.poems}
                </span>
              </div>
              <div className="mt" style={{ marginTop: 8 }}>
                <ProgressMulti parts={[[st.mastered, 'var(--accent)'], [st.learning, 'color-mix(in srgb, var(--accent) 45%, white)'], [st.weak, 'var(--red)']]} max={st.chars} />
              </div>
            </Link>
          )
        })}
      </div>

      <h2 className="section-title">复习箱</h2>
      <div className="card">
        <p className="small muted">答对一次进下一箱，箱号越大间隔越长；答错退回第 1 箱。</p>
        <div className="row-wrap mt">
          {boxes.map((n, k) => (
            <div key={k} className="stat" style={{ minWidth: 88 }}>
              <b>{n}</b>
              <span>
                第 {k} 箱 · {INTERVALS[k]} 天
              </span>
            </div>
          ))}
        </div>
      </div>

      {recent.length > 0 && (
        <>
          <h2 className="section-title">最近活动</h2>
          <div className="card">
            {recent.map(([day, rec]) => (
              <div key={day} className="spread small" style={{ padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{day}</span>
                <span className="muted">
                  {rec.review ? `复习 ${rec.review} ` : ''}
                  {rec.learn ? `新学 ${rec.learn} ` : ''}
                  {rec.write ? `写字 ${rec.write} ` : ''}
                  {rec.poem ? `古诗 ${rec.poem}` : ''}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
