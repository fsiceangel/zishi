import React from 'react'

// React.lazy that survives a redeploy: when a hashed chunk is gone (the page was
// opened before a new version shipped) reload once to pick up the new index.html.
export function lazyWithReload(importer, key) {
  return React.lazy(() =>
    importer().catch((err) => {
      const flag = `zishi-reload-${key}`
      let reloaded = false
      try {
        reloaded = sessionStorage.getItem(flag) === '1'
        if (!reloaded) sessionStorage.setItem(flag, '1')
      } catch {
        /* ignore */
      }
      if (!reloaded) {
        window.location.reload()
        return new Promise(() => {})
      }
      throw err
    })
  )
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        this.props.fallback || (
          <div className="card center" style={{ margin: '16px 0' }}>
            <p className="muted">这一块没加载出来。</p>
            <button className="btn btn-sm mt" onClick={() => window.location.reload()}>
              刷新页面
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
