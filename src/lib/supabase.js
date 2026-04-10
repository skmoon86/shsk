import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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
