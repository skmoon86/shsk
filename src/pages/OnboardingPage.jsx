import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

const DEFAULT_CATEGORIES = [
  { name: '식재료', icon: '🛒', color: '#22c55e' },
  { name: '배달/외식', icon: '🍜', color: '#f97316' },
  { name: '카페/간식', icon: '☕', color: '#a78bfa' },
  { name: '술/회식', icon: '🍺', color: '#facc15' },
  { name: '기타', icon: '📦', color: '#94a3b8' },
]

export default function OnboardingPage() {
  const navigate = useNavigate()
  const { user, fetchHousehold } = useAuthStore()
  const [tab, setTab] = useState('create') // 'create' | 'join'
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('이름을 입력해주세요'); return }
    setLoading(true)
    try {
      const invite_code = generateCode()
      const { data: householdId, error: hErr } = await supabase
        .rpc('create_household', {
          household_name: name.trim(),
          household_invite_code: invite_code,
        })
      if (hErr) throw hErr

      await supabase.from('categories').insert(
        DEFAULT_CATEGORIES.map(c => ({ ...c, household_id: householdId }))
      )

      await fetchHousehold(user.id)
      navigate('/', { replace: true })
    } catch (e) {
      console.error('그룹 생성 에러:', e)
      toast.error(`그룹 생성에 실패했어요: ${e.message}`)
    }
    setLoading(false)
  }

  const handleJoin = async () => {
    if (!code.trim()) { toast.error('초대 코드를 입력해주세요'); return }
    setLoading(true)
    try {
      const { data: household, error } = await supabase
        .from('households')
        .select()
        .eq('invite_code', code.trim().toUpperCase())
        .single()
      if (error || !household) { toast.error('유효하지 않은 코드예요'); setLoading(false); return }

      await supabase.from('memberships').insert({ household_id: household.id, user_id: user.id, role: 'member' })
      await fetchHousehold(user.id)
      navigate('/', { replace: true })
    } catch {
      toast.error('참여에 실패했어요')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">🍽️</div>
          <h1 className="text-2xl font-display font-bold">가계부 설정</h1>
          <p className="text-sm text-surface-800/50">새로 만들거나 초대 코드로 참여하세요</p>
        </div>

        <div className="flex gap-1 bg-surface-100 rounded-2xl p-1">
          {['create', 'join'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all ${
                tab === t ? 'bg-surface-0 shadow-card text-surface-900' : 'text-surface-800/40'
              }`}>
              {t === 'create' ? '새로 만들기' : '초대 코드로 참여'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {tab === 'create' ? (
            <>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="가계부 이름 (예: 우리집 식비)"
                className="w-full border border-surface-200 rounded-2xl px-4 py-3.5 font-body text-sm outline-none focus:ring-2 focus:ring-brand-300"
              />
              <button onClick={handleCreate} disabled={loading}
                className="w-full bg-brand-500 text-white rounded-2xl py-4 font-display font-semibold shadow-card hover:bg-brand-600 transition-all disabled:opacity-50">
                {loading ? '생성 중...' : '가계부 만들기'}
              </button>
            </>
          ) : (
            <>
              <input
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="초대 코드 6자리"
                className="w-full border border-surface-200 rounded-2xl px-4 py-3.5 font-mono text-center tracking-widest text-lg outline-none focus:ring-2 focus:ring-brand-300 uppercase"
                maxLength={6}
              />
              <button onClick={handleJoin} disabled={loading}
                className="w-full bg-brand-500 text-white rounded-2xl py-4 font-display font-semibold shadow-card hover:bg-brand-600 transition-all disabled:opacity-50">
                {loading ? '참여 중...' : '참여하기'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
