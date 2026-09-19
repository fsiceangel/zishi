import React, { useState } from 'react'
import { Link } from '../components/ui.jsx'
import { useProgress } from '../App.jsx'
import { VOLUMES } from '../lib/data.js'
import { setSetting, setProfile, exportJSON, importJSON, resetAll } from '../lib/storage.js'
import { speak, available } from '../lib/tts.js'

export default function Settings() {
  const state = useProgress()
  const [exp, setExp] = useState('')
  const [imp, setImp] = useState('')
  const [msg, setMsg] = useState('')
  const s = state.settings

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <div className="eyebrow">设置</div>
        <h1>设置</h1>
      </div>
      <div className="card stack">
        <label className="spread">
          <span>名字</span>
          <input value={state.profile.name} onChange={(e) => setProfile({ name: e.target.value })} placeholder="写上名字" style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line-strong)' }} />
        </label>
        <label className="spread">
          <span>当前课本</span>
          <select value={state.profile.current} onChange={(e) => setProfile({ current: e.target.value })} style={{ padding: '6px 10px', borderRadius: 10, border: '1px solid var(--line-strong)' }}>
            {VOLUMES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label className="spread">
          <span>默认显示拼音</span>
          <input type="checkbox" checked={s.pinyin} onChange={(e) => setSetting('pinyin', e.target.checked)} />
        </label>
        <label className="spread">
          <span>朗读（TTS）{!available() && <span className="small faint">这个浏览器不支持</span>}</span>
          <input type="checkbox" checked={s.tts} onChange={(e) => setSetting('tts', e.target.checked)} />
        </label>
        <label className="spread">
          <span>朗读速度 {s.rate}</span>
          <input type="range" min="0.6" max="1.2" step="0.1" value={s.rate} onChange={(e) => setSetting('rate', Number(e.target.value))} />
        </label>
        <div>
          <button className="btn btn-sm" onClick={() => speak('床前明月光，疑是地上霜。', { rate: s.rate })}>
            试听
          </button>
        </div>
      </div>

      <h2 className="section-title">备份</h2>
      <div className="card stack">
        <p className="small muted">进度只存在这台设备的浏览器里。换设备或清理浏览器前，把下面的内容复制保存；在新设备粘贴回来即可。</p>
        <div className="row-wrap">
          <button className="btn btn-sm" onClick={() => setExp(exportJSON())}>
            生成备份
          </button>
          {exp && (
            <button className="btn btn-sm btn-soft" onClick={() => navigator.clipboard?.writeText(exp).then(() => setMsg('已复制'))}>
              复制到剪贴板
            </button>
          )}
          {msg && <span className="small muted">{msg}</span>}
        </div>
        {exp && <textarea className="import" readOnly value={exp} />}
        <textarea className="import" placeholder="把备份内容粘贴到这里……" value={imp} onChange={(e) => setImp(e.target.value)} />
        <div>
          <button
            className="btn btn-sm"
            disabled={!imp.trim()}
            onClick={() => {
              try {
                importJSON(imp)
                setMsg('已恢复')
                setImp('')
              } catch (e) {
                setMsg(e.message)
              }
            }}
          >
            恢复备份
          </button>
        </div>
      </div>

      <h2 className="section-title">重置</h2>
      <div className="card">
        <button
          className="btn btn-sm btn-ghost"
          style={{ color: 'var(--red)' }}
          onClick={() => {
            if (window.confirm('清空全部进度？这个操作不能撤销。')) resetAll()
          }}
        >
          清空全部进度
        </button>
      </div>
      <p className="small faint mt-lg">
        <Link to="/">← 回首页</Link>
      </p>
    </div>
  )
}
