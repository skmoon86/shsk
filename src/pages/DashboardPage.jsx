import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
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
      const id = e.category_id || ''
      if (!map[key]) map[key] = { id, name: key, icon, color, total: 0 }
      map[key].total += e.amount
    }
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [expenses])

  const recent = expenses.slice(0, 5)
  const [expandedId, setExpandedId] = useState(null)

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
              <div key={cat.name} onClick={() => navigate(`/history?category=${cat.id}`)}
                className="flex items-center gap-3 bg-surface-0 rounded-2xl px-4 py-3 shadow-card cursor-pointer active:scale-[0.98] transition-transform">
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
            {recent.map(e => {
              const hasItems = e.expense_items && e.expense_items.length > 0
              const isExpanded = expandedId === e.id
              return (
                <div key={e.id} className="bg-surface-0 rounded-2xl shadow-card overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-surface-50 transition-colors"
                    onClick={() => navigate(`/edit/${e.id}`)}
                  >
                    <span className="text-xl">{e.categories?.icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-body text-sm text-surface-900 truncate">{e.categories?.name || '기타'}</p>
                        {hasItems && (
                          <span className="shrink-0 text-[10px] font-body text-brand-500 bg-brand-50 rounded-full px-1.5 py-0.5">
                            {e.expense_items.length}개 품목
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-surface-800/40 truncate">
                          {dayjs(e.date).format('M.D')}{e.memo ? ` | ${e.memo}` : ''}
                        </span>
                        {e.payment_method && (
                          <span className="text-[10px] font-body text-surface-800/40">
                            {e.payment_method === 'card' ? '💳' : e.payment_method === 'cash' ? '💵' : '🏷️'}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasItems && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); setExpandedId(isExpanded ? null : e.id) }}
                        className="p-1 shrink-0"
                      >
                        {isExpanded
                          ? <ChevronUp size={14} className="text-brand-500" />
                          : <ChevronDown size={14} className="text-surface-800/30" />
                        }
                      </button>
                    )}
                    <span className="font-display font-semibold text-sm">{formatKRW(e.amount)}</span>
                  </div>
                  {hasItems && isExpanded && (
                    <div className="px-4 pb-3 pt-2 ml-9 space-y-1.5 border-t border-surface-100">
                      {e.expense_items.map(item => (
                        <div key={item.id}
                          className="flex justify-between items-center py-1 cursor-pointer rounded-lg px-1 -mx-1 hover:bg-brand-50 active:bg-brand-100 transition-colors"
                          onClick={(ev) => {
                            ev.stopPropagation()
                            navigate(`/item-history?name=${encodeURIComponent(item.name)}`)
                          }}>
                          <span className="text-xs font-body text-brand-600 underline underline-offset-2">
                            {item.name}
                            {item.quantity > 1 && <span className="text-surface-800/40 no-underline ml-1">x{item.quantity}</span>}
                          </span>
                          <span className="text-xs font-display font-semibold text-surface-800/70">
                            {formatKRW(item.amount * (item.quantity || 1))}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-1.5 border-t border-surface-100">
                        <span className="text-xs font-body text-surface-800/40">합계</span>
                        <span className="text-xs font-display font-bold text-surface-900">
                          {formatKRW(e.expense_items.reduce((s, i) => s + i.amount, 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
