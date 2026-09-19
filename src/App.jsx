import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { Link } from './components/ui.jsx'
import { load, subscribe } from './lib/storage.js'
import { VOLUME_BY_ID } from './lib/data.js'
import Home from './views/Home.jsx'
import Shelf from './views/Shelf.jsx'
import VolumePage from './views/VolumePage.jsx'
import LessonPage from './views/LessonPage.jsx'
import LearnSession from './views/LearnSession.jsx'
import ReviewSession from './views/ReviewSession.jsx'
import PoemPage from './views/PoemPage.jsx'
import Placement from './views/Placement.jsx'
import ProgressPage from './views/ProgressPage.jsx'
import Library from './views/Library.jsx'
import Settings from './views/Settings.jsx'
import CharSheet from './views/CharSheet.jsx'

const CharSheetCtx = createContext(() => {})
export const useOpenChar = () => useContext(CharSheetCtx)

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const on = () => {
      setHash(window.location.hash.slice(1) || '/')
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

// re-render on any progress change
export function useProgress() {
  const [, tick] = useState(0)
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  return load()
}

function route(hash) {
  const parts = hash.split('/').filter(Boolean)
  const [a, b, c] = parts
  if (!a) return <Home />
  if (a === 'shelf') return <Shelf />
  if (a === 'book' && b) return <VolumePage id={b} />
  if (a === 'lesson' && b) return <LessonPage id={decodeURIComponent(b)} />
  if (a === 'learn' && b) return <LearnSession key={hash} id={decodeURIComponent(b)} mode={c || 'learn'} />
  if (a === 'review') return <ReviewSession key={hash} scope={b ? decodeURIComponent(b) : null} />
  if (a === 'poem' && b) return <PoemPage key={hash} id={decodeURIComponent(b)} />
  if (a === 'placement' && b) return <Placement key={hash} id={b} />
  if (a === 'progress') return <ProgressPage />
  if (a === 'library') return <Library />
  if (a === 'settings') return <Settings />
  return <Home />
}

export default function App() {
  const hash = useHash()
  const state = useProgress()
  const [sheetChar, setSheetChar] = useState(null)
  const openChar = useCallback((c) => setSheetChar(c), [])
  useEffect(() => setSheetChar(null), [hash])
  const top = hash.split('/').filter(Boolean)[0] || ''
  const current = VOLUME_BY_ID[state.profile.current] || VOLUME_BY_ID['3a']
  const gradeClass = `g${current.grade}`

  return (
    <CharSheetCtx.Provider value={openChar}>
      <div className={`app ${gradeClass}`}>
        <header className="app-header">
          <div className="app-header-inner">
            <Link to="/" className="brand">
              <span className="brand-mark">字</span>
              <span>字诗</span>
            </Link>
            <nav className="nav" aria-label="主导航">
              <Link to="/" className={top === '' ? 'active' : ''}>今日</Link>
              <Link to="/shelf" className={['shelf', 'book', 'lesson'].includes(top) ? 'active' : ''}>书架</Link>
              <Link to="/library" className={top === 'library' ? 'active' : ''}>字库</Link>
              <Link to="/progress" className={top === 'progress' ? 'active' : ''}>成长</Link>
            </nav>
          </div>
        </header>
        <main>{route(hash)}</main>
        <footer className="app-footer">字诗 · 部编版语文 1–6 年级识字表、写字表与古诗词 · 进度只保存在这台设备上</footer>
        <CharSheet c={sheetChar} onClose={() => setSheetChar(null)} />
      </div>
    </CharSheetCtx.Provider>
  )
}
