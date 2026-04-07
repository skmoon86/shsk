import { useState } from 'react'
import { Copy, Check, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, household, signOut } = useAuthStore()
  const [copied, setCopied] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(household?.invite_code || '')
    setCopied(true)
    toast.success('복사했어요!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="px-5 pt-8 pb-4 space-y-6">
      <h1 className="text-2xl font-display font-bold">설정</h1>

      {/* Profile */}
      <div className="bg-surface-0 rounded-3xl p-5 shadow-card flex items-center gap-4">
        {user?.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="프로필"
            className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-display font-bold text-lg">
            {user?.user_metadata?.name?.slice(0, 1) || '?'}
          </div>
        )}
        <div>
          <p className="font-display font-semibold text-surface-900">{user?.user_metadata?.name || '사용자'}</p>
          <p className="text-xs font-body text-surface-800/40">{user?.email}</p>
        </div>
      </div>

      {/* Household */}
      {household && (
        <div className="bg-surface-0 rounded-3xl p-5 shadow-card space-y-4">
          <h2 className="text-sm font-display font-semibold text-surface-800/50">가계부 그룹</h2>
          <div>
            <p className="font-display font-semibold text-surface-900 text-lg">{household.name}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-body text-surface-800/40">초대 코드 — 이 코드를 공유하면 같이 기록할 수 있어요</p>
            <div className="flex items-center gap-3 bg-surface-50 rounded-2xl px-4 py-3">
              <span className="flex-1 font-mono font-bold text-xl tracking-widest text-surface-900">
                {household.invite_code}
              </span>
              <button onClick={copyCode}
                className="text-brand-500 hover:text-brand-600 transition-colors">
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign out */}
      <button
        onClick={signOut}
        className="w-full flex items-center justify-center gap-2 bg-surface-0 border border-red-100 rounded-2xl py-4 text-red-500 font-display font-semibold shadow-card hover:bg-red-50 transition-all"
      >
        <LogOut size={16} /> 로그아웃
      </button>
    </div>
  )
}
