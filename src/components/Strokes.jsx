import React, { useEffect, useRef, useState } from 'react'
import HanziWriter from 'hanzi-writer'

const BASE = import.meta.env.BASE_URL
const cache = new Map()
function loader(char, onLoad, onError) {
  const hex = char.codePointAt(0).toString(16)
  if (cache.has(hex)) return cache.get(hex).then(onLoad, onError)
  const p = fetch(`${BASE}strokes/${hex}.json`).then((r) => {
    if (!r.ok) throw new Error('no stroke data')
    return r.json()
  })
  cache.set(hex, p)
  p.then(onLoad, onError)
}

// 田字格 + Hanzi Writer. mode: 'show' (static + replay button) | 'animate' | 'quiz'
export default function Strokes({ char, mode = 'show', size = 240, onQuizDone, autoplay = true, showOutline = true }) {
  const ref = useRef(null)
  const writer = useRef(null)
  const [hint, setHint] = useState('')
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = ''
    setMissing(false)
    setHint('')
    const w = HanziWriter.create(ref.current, char, {
      width: size,
      height: size,
      padding: 18,
      showOutline,
      showCharacter: mode !== 'quiz',
      strokeColor: '#2d2a32',
      outlineColor: '#e4dccf',
      radicalColor: '#c9563b',
      drawingColor: '#2a9d8f',
      drawingWidth: 14,
      strokeAnimationSpeed: 1.2,
      delayBetweenStrokes: 220,
      delayBetweenLoops: 1500,
      charDataLoader: loader,
      onLoadCharDataError: () => setMissing(true),
    })
    writer.current = w
    if (mode === 'animate' && autoplay) w.animateCharacter()
    if (mode === 'quiz') {
      setHint('照着笔顺，在格子里写一写')
      w.quiz({
        showHintAfterMisses: 2,
        leniency: 1.3,
        onMistake: (d) => setHint(d.mistakesOnStroke >= 2 ? '再看看这一笔的方向' : '不对，再试一次'),
        onCorrectStroke: (d) => setHint(`第 ${d.strokeNum + 1} 笔 ✓`),
        onComplete: (d) => {
          setHint(d.totalMistakes === 0 ? '全对！' : `写完了，错了 ${d.totalMistakes} 笔`)
          onQuizDone && onQuizDone(d)
        },
      })
    }
    return () => {
      writer.current = null
    }
  }, [char, mode, size, showOutline, autoplay, onQuizDone])

  const replay = () => writer.current && writer.current.animateCharacter()

  return (
    <div>
      <div className="strokes" style={{ width: size, height: size }}>
        <svg className="grid" viewBox="0 0 100 100" aria-hidden="true">
          <rect x="0.5" y="0.5" width="99" height="99" rx="6" fill="#fff" stroke="#d8cec1" />
          <path d="M50 0.5V99.5M0.5 50H99.5" stroke="#eae2d8" strokeWidth="0.8" />
          <path d="M0.5 0.5L99.5 99.5M99.5 0.5L0.5 99.5" stroke="#eae2d8" strokeWidth="0.6" strokeDasharray="2 2" />
        </svg>
        <div className="writer" ref={ref} />
      </div>
      <div className="strokes-hint">{missing ? '暂无这个字的笔顺' : hint}</div>
      {mode !== 'quiz' && !missing && (
        <div className="center" style={{ marginTop: 6 }}>
          <button className="btn btn-sm btn-ghost" onClick={replay}>
            看笔顺
          </button>
        </div>
      )}
    </div>
  )
}
