import React, { useState, useMemo } from 'react'
import { CharTile } from '../components/ui.jsx'
import { useProgress, useOpenChar } from '../App.jsx'
import { VOLUMES, CHARS, volumeChars } from '../lib/data.js'
import { stageOf, STAGE_LABEL } from '../lib/srs.js'

const STAGES = ['all', 'new', 'weak', 'learning', 'mastered']

export default function Library() {
  const state = useProgress()
  const openChar = useOpenChar()
  const [vol, setVol] = useState(state.profile.current)
  const [stage, setStage] = useState('all')
  const [query, setQuery] = useState('')
  const v = VOLUMES.find((x) => x.id === vol) || VOLUMES[0]
  const list = useMemo(() => {
    let cs = vol === 'all' ? Object.keys(CHARS) : [...new Set(volumeChars(v))]
    if (query.trim()) {
      const qq = query.trim().toLowerCase()
      cs = cs.filter((c) => c === qq || CHARS[c].py.startsWith(qq) || CHARS[c].words.some((w) => w.includes(qq)))
    }
    if (stage !== 'all') cs = cs.filter((c) => stageOf(state.chars[c]) === stage)
    return cs
  }, [vol, stage, query, state, v])

  return (
    <div className={`page g${v.grade}`}>
      <div className="page-head">
        <div className="eyebrow">全部 {Object.keys(CHARS).length} 个字</div>
        <h1>字库</h1>
      </div>
      <input className="search" placeholder="搜一个字、拼音或词语" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="filters">
        <select value={vol} onChange={(e) => setVol(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line-strong)' }}>
          <option value="all">全部册</option>
          {VOLUMES.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <div className="seg">
          {STAGES.map((s) => (
            <button key={s} className={stage === s ? 'on' : ''} onClick={() => setStage(s)}>
              {s === 'all' ? '全部' : STAGE_LABEL[s]}
            </button>
          ))}
        </div>
        <span className="small muted">{list.length} 个</span>
      </div>
      <div className="tiles">
        {list.slice(0, 600).map((c) => (
          <CharTile key={c} c={c} write={!!CHARS[c].write} onClick={() => openChar(c)} />
        ))}
      </div>
      {list.length > 600 && <p className="small muted mt">只显示前 600 个，换个筛选条件看别的。</p>}
    </div>
  )
}
