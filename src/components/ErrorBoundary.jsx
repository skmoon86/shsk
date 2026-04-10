import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // 콘솔에 남겨두면 DevTools/Sentry 등에서 추적 가능
    console.error('[ErrorBoundary]', error, info)
  }

  handleReload = () => {
    this.setState({ error: null })
    window.location.reload()
  }

  handleHome = () => {
    this.setState({ error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6 bg-surface-50">
          <div className="max-w-sm w-full bg-surface-0 rounded-2xl shadow-card p-6 space-y-4 text-center">
            <div className="text-4xl">😵</div>
            <h1 className="font-display font-bold text-lg text-surface-900">
              화면을 그리는 중 문제가 생겼어요
            </h1>
            <p className="text-sm font-body text-surface-800/60 break-words">
              {this.state.error?.message || '알 수 없는 오류'}
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={this.handleHome}
                className="flex-1 py-3 rounded-2xl border border-surface-200 font-body text-sm text-surface-800 hover:bg-surface-50 transition-all"
              >
                홈으로
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-body text-sm font-semibold hover:bg-brand-600 transition-all"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
