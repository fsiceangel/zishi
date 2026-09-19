import React, { useMemo, useState } from 'react'
import { Link, CharTile, Progress } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUME_BY_ID, volumeChars } from '../lib/data.js'
import { setCharKnown, logDay } from '../lib/storage.js'

const PAGE = 40

// Placement: page through every 识字 character of a volume; tap the ones she does NOT know.
export default function Placement({ id }) {
  const state = useProgress()
  const v = VOLUME_BY_ID[id]
  const chars = useMemo(() => (v ? [...new Set(volumeChars(v))] : []), [v])
  const [page, setPage] = useState(0)
  const [unknown, setUnknown] = useState(() => new Set())
  const [done, setDone] = useState(false)
  if (!v) return <div className="page">没有这本书。</div>
  const pages = Math.ceil(chars.length / PAGE)
  const slice = chars.slice(page * PAGE, page * PAGE + PAGE)
  const toggle = (c) =>
    setUnknown((s) => {
      const n = new Set(s)
      n.has(c) ? n.delete(c) : n.add(c)
      return n
    })
  const apply = () => {
    for (const c of chars) setCharKnown(c, !unknown.has(c))
    logDay('learn', chars.length - unknown.size)
    setDone(true)
  }

  if (done)
    return (
      <div className={`page session center g${v.grade}`}>
        <div className="eyebrow">摸底完成</div>
        <div className="summary-num">
          {chars.length - unknown.size}
          <span className="muted" style={{ fontSize: 28 }}> / {chars.length}</span>
        </div>
        <p className="muted">
          {unknown.size === 0 ? `${v.name}的字都认识，它们进入长间隔复习。` : `${unknown.size} 个不认识的字已经排进今天的复习，认识的字一周后回来抽查。`}
        </p>
        <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
          {unknown.size > 0 && (
            <Link to="/review" className="btn btn-primary btn-lg">
              现在就学这些字
            </Link>
          )}
          <Link to={`/book/${v.id}`} className="btn">
            回到课本
          </Link>
        </div>
      </div>
    )

  return (
    <div className={`page g${v.grade}`}>
      <div className="page-head">
        <Link to={`/book/${v.id}`} className="small muted">
          ← {v.name}
        </Link>
        <h1 style={{ marginTop: 6 }}>摸底 · {v.short}</h1>
        <p className="lede">
          认识的字不用管，<b>不认识的点一下</b>（变红）。一页一页翻完，最后按"完成"。共 {chars.length} 个字，{pages} 页。
        </p>
      </div>
      <div className="session-top">
        <Progress value={page} max={pages} />
        <span className="small muted">
          第 {page + 1} / {pages} 页 · 已标 {unknown.size} 个
        </span>
      </div>
      <div className="tiles tiles-lg">
        {slice.map((c) => (
          <CharTile key={c} c={c} large selected={unknown.has(c)} showStage={false} onClick={() => toggle(c)} />
        ))}
      </div>
      <div className="row-wrap mt-lg" style={{ justifyContent: 'center' }}>
        {page > 0 && (
          <button className="btn" onClick={() => setPage(page - 1)}>
            上一页
          </button>
        )}
        {page + 1 < pages ? (
          <button className="btn btn-primary btn-lg" onClick={() => setPage(page + 1)}>
            下一页
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={apply}>
            完成摸底
          </button>
        )}
      </div>
    </div>
  )
}
