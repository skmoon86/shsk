import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuthStore } from '@/stores/authStore'

function formatKRW(n) {
  return n.toLocaleString('ko-KR') + '원'
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { household } = useAuthStore()
  const [month, setMonth] = useState(dayjs().startOf('month'))

  const prevMonth = () => setMonth(m => m.subtract(1, 'month'))
  const nextMonth = () => setMonth(m => m.add(1, 'month'))
  const isCurrentMonth = month.isSame(dayjs(), 'month')

  const { expenses, loading } = useExpenses({
    from: month.startOf('month').format('YYYY-MM-DD'),
    to:   month.endOf('month').format('YYYY-MM-DD'),
  })

  const totalThisMonth = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  const byCategory = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const key = e.categories?.name || '기타'
      const icon = e.categories?.icon || '📦'
      const color = e.categories?.color || '#94a3b8'
      if (!map[key]) map[key] = { name: key, icon, color, total: 0 }
      map[key].total += e.amount
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [expenses])

  const recent = expenses.slice(0, 5)

  return (
    <div className="px-5 pt-8 pb-4 space-y-6">
      {/* Header with month navigation */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-surface-100 transition-colors">
              <ChevronLeft size={18} className="text-surface-800/40" />
            </button>
            <p className="text-sm text-surface-800/40 font-body">{month.format('YYYY년 M월')} 식비</p>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="p-1 rounded-lg hover:bg-surface-100 transition-colors disabled:opacity-20"
            >
              <ChevronRight size={18} className="text-surface-800/40" />
            </button>
          </div>
          <h1 className="text-4xl font-display font-bold text-surface-900 mt-0.5">
            {loading ? '—' : formatKRW(totalThisMonth)}
          </h1>
        </div>
        <div className="text-3xl">{household?.name?.slice(0, 1) ? '🍚' : '🍽️'}</div>
      </div>

      {/* Category summary */}
      {byCategory.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-display font-semibold text-surface-800/50 uppercase tracking-wide">카테고리별</h2>
          <div className="space-y-2">
            {byCategory.map(cat => (
              <div key={cat.name} className="flex items-center gap-3 bg-surface-0 rounded-2xl px-4 py-3 shadow-card">
                <span className="text-xl">{cat.icon}</span>
                <span className="flex-1 font-body text-sm text-surface-800">{cat.name}</span>
                <span className="font-display font-semibold text-sm text-surface-900">{formatKRW(cat.total)}</span>
                <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((cat.total / totalThisMonth) * 100)}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-display font-semibold text-surface-800/50 uppercase tracking-wide">최근 지출</h2>
          <button onClick={() => navigate('/history')} className="text-xs text-brand-500 font-body">전체 보기</button>
        </div>
        {loading ? (
          <div className="text-center py-8 text-surface-800/30 font-body text-sm">불러오는 중...</div>
        ) : recent.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="text-4xl">🍽️</div>
            <p className="text-surface-800/40 font-body text-sm">아직 기록이 없어요</p>
            <button onClick={() => navigate('/add')}
              className="inline-flex items-center gap-2 bg-brand-500 text-white rounded-2xl px-5 py-2.5 text-sm font-display font-semibold shadow-card">
              <PlusCircle size={16} /> 첫 기록 남기기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recent.map(e => (
              <div key={e.id}
                onClick={() => navigate(`/edit/${e.id}`)}
                className="flex items-center gap-3 bg-surface-0 rounded-2xl px-4 py-3 shadow-card cursor-pointer active:bg-surface-50 transition-colors"
              >
                <span className="text-xl">{e.categories?.icon || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-surface-900 truncate">{e.categories?.name || '기타'}</p>
                  <p className="text-xs text-surface-800/40 truncate">
                    {dayjs(e.date).format('M.D')}{e.memo ? ` | ${e.memo}` : ''}
                  </p>
                </div>
                <span className="font-display font-semibold text-sm">{formatKRW(e.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
