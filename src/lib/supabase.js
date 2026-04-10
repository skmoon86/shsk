import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
}

// 삼성 인터넷 일부 버전은 navigator.locks 구현이 깨져 있어서
// Supabase 기본 lock(processLock/navigatorLock)을 쓰면 세션/쿼리가
// 영원히 pending 상태로 멈춘다. lock을 no-op으로 대체해 우회한다.
// (단일 탭 기준으로는 race condition 위험이 거의 없음)
const noopLock = async (_name, _acquireTimeout, fn) => await fn()

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: noopLock,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/**
 * Supabase 쿼리/Promise를 타임아웃으로 감싼다.
 * 네트워크가 끊기거나 Supabase가 응답하지 않을 때 영원히 pending되는 것을 방지한다.
 *
 * 사용 예: const { data, error } = await withTimeout(supabase.from('x').select())
 */
export function withTimeout(promise, ms = 15000, label = '요청') {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} 시간 초과 (${ms / 1000}초). 네트워크 상태를 확인해주세요.`))
    }, ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * localStorage에서 Supabase access_token을 직접 꺼낸다.
 * supabase.auth.getSession()이 내부에서 navigator.locks를 쓰는데
 * 삼성 인터넷 일부 버전에서 이게 hang 걸리는 이슈 우회용.
 */
export function getAccessTokenFromStorage() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) continue
      const raw = localStorage.getItem(key)
      if (!raw) continue
      const parsed = JSON.parse(raw)
      const token = parsed?.access_token || parsed?.currentSession?.access_token
      if (token) return token
    }
  } catch (err) {
    console.warn('[getAccessTokenFromStorage]', err)
  }
  return null
}

/**
 * Supabase Storage REST API에 XHR로 직접 업로드.
 * Supabase JS SDK가 내부에서 fetch(body: Blob)을 쓰는데,
 * 삼성 인터넷 일부 버전에서 이게 행이 걸리는 이슈가 있어 XHR로 우회한다.
 */
export function xhrUpload(url, blob, contentType, accessToken, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url, true)
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`)
    xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('cache-control', 'max-age=3600')

    xhr.timeout = 60000

    if (xhr.upload && onProgress) {
      let lastPct = -1
      xhr.upload.onprogress = (e) => {
        if (!e.lengthComputable) return
        const pct = Math.floor((e.loaded / e.total) * 100)
        if (pct !== lastPct && pct % 20 === 0) {
          lastPct = pct
          onProgress(`C2. 업로드 ${pct}%`)
        }
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText)) }
        catch { resolve({}) }
      } else {
        reject(new Error(`업로드 실패 (HTTP ${xhr.status}): ${xhr.responseText?.slice(0, 200) || ''}`))
      }
    }
    xhr.onerror   = () => reject(new Error('업로드 네트워크 오류'))
    xhr.ontimeout = () => reject(new Error('업로드 시간 초과 (60초)'))
    xhr.onabort   = () => reject(new Error('업로드 취소됨'))

    try {
      xhr.send(blob)
    } catch (err) {
      reject(err)
    }
  })
}
