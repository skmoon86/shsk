import './lib/patch-locks.js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import toast from 'react-hot-toast'

// 삼성 인터넷 디버깅: 새 번들이 실제 로드되었는지 확인용
const BUILD_TAG = 'patch-getSession'
setTimeout(() => { toast(`BUILD ${BUILD_TAG} / locks=${!!navigator.locks}`, { duration: 4000 }) }, 500)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
