import React, { useEffect } from 'react'
import { CHARS } from '../lib/data.js'
import { stageOf } from '../lib/srs.js'
import { charEntry } from '../lib/storage.js'
import { speak } from '../lib/tts.js'

export function Link({ to, className, children, ...rest }) {
  return (
    <a href={`#${to}`} className={className} {...rest}>
      {children}
    </a>
  )
}

export function Progress({ value, max, className = '' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={`progress ${className}`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

// three-colour bar: mastered / learning / rest
export function ProgressMulti({ parts, max }) {
  return (
    <div className="progress-multi">
      {parts.map(([n, color], i) => (
        <i key={i} style={{ width: `${max ? (n / max) * 100 : 0}%`, background: color }} />
      ))}
    </div>
  )
}

export function Ruby({ ch, py, className = '' }) {
  return (
    <span className={`ruby ${className}`}>
      <span className="py">{py || ' '}</span>
      <span className="ch">{ch}</span>
    </span>
  )
}

export function CharTile({ c, write, large, selected, onClick, showStage = true }) {
  const info = CHARS[c]
  const stage = showStage ? stageOf(charEntry(c)) : 'new'
  const cls = ['tile', large ? 'tile-lg' : '', write ? 'write' : '', showStage ? `stage-${stage}` : '', selected ? 'selected' : ''].join(' ')
  return (
    <button className={cls} onClick={onClick} aria-label={c}>
      <span className="py">{info?.py || ''}</span>
      <span className="ch">{c}</span>
    </button>
  )
}

export function Sheet({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" style={wide ? { maxWidth: 820 } : undefined} onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="sheet-head">
          <h3 style={{ fontSize: 20 }}>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Heatmap({ days, weeks = 14 }) {
  const cells = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - (weeks * 7 - 1) - today.getDay())
  for (let i = 0; i < weeks * 7 + today.getDay() + 1; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (d > today) break
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const rec = days[key]
    const n = rec ? Object.values(rec).reduce((a, b) => a + b, 0) : 0
    const lvl = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : n < 50 ? 3 : 4
    cells.push(<i key={key} className={lvl ? `l${lvl}` : ''} title={`${key} · ${n}`} />)
  }
  return <div className="heatmap">{cells}</div>
}

export const Icon = {
  speaker: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13" />
    </svg>
  ),
  back: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5L19 7" />
    </svg>
  ),
}

export function SpeakButton({ text, rate, className = '' }) {
  return (
    <button
      className={`icon-btn ${className}`}
      aria-label="朗读"
      onClick={(e) => {
        e.stopPropagation()
        speak(text, { rate })
      }}
    >
      {Icon.speaker}
    </button>
  )
}
