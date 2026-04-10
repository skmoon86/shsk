// 삼성 인터넷 일부 버전은 navigator.locks 구현이 깨져 있어서
// Supabase 내부의 auth lock 호출이 pending 상태로 hang 걸린다.
// Supabase JS의 auth.lock 옵션만으로는 모든 경로를 못 막는 경우가
// 있어 navigator.locks 자체를 안전한 polyfill로 교체한다.
//
// 반드시 @supabase/supabase-js 가 import 되기 전에 실행되어야 하므로,
// 이 파일은 main.jsx 가장 첫 줄에서 side-effect import 된다.

if (typeof navigator !== 'undefined') {
  const safeLocks = {
    request: async (name, options, cb) => {
      if (typeof options === 'function') { cb = options; options = {} }
      return await cb({ name: typeof name === 'string' ? name : '', mode: 'exclusive' })
    },
    query: async () => ({ held: [], pending: [] }),
  }
  try {
    Object.defineProperty(navigator, 'locks', {
      value: safeLocks,
      configurable: true,
      writable: true,
    })
  } catch {
    try { navigator.locks = safeLocks } catch {}
  }
}
