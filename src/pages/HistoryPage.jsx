import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import dayjs from 'dayjs'
import { useExpenses } from '@/hooks/useExpenses'
import { useCategories } from '@/hooks/useCategories'

function formatKRW(n) { return n.toLocaleString('ko-KR') + '원' }

export default function HistoryPage() {
  const [filterCat, setFilterCat] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo]   = useState('')
  const navigate = useNavigate()
  const [expandedId, setExpandedId] = useState(null)
  const { expenses, loading, deleteExpense } = useExpenses({
    category_id: filterCat || undefined,
    from: filterFrom || undefined,
    to:   filterTo   || undefined,
  })
  const { categories } = useCategories()

  const grouped = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const day = dayjs(e.date).format('YYYY-MM-DD')
      if (!map[day]) map[day] = []
      map[day].push(e)
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]))
  }, [expenses])

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  return (
    <div className="px-5 pt-8 pb-4 space-y-5">
      <h1 className="text-2xl font-display font-bold">지출 내역</h1>

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilterCat('')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-body transition-all ${
              !filterCat ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-800/60'
            }`}>전체</button>
          {categories.map(cat => (
            <button key={cat.id}
              onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-body transition-all ${
                filterCat === cat.id ? 'bg-brand-500 text-white' : 'bg-surface-100 text-surface-800/60'
              }`}>
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
            className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-xs font-body outline-none" />
          <span className="text-surface-800/30 self-center">~</span>
          <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
            className="flex-1 border border-surface-200 rounded-xl px-3 py-2 text-xs font-body outline-none" />
        </div>
      </div>

      {/* Total */}
      {!loading && expenses.length > 0 && (
        <div className="bg-brand-50 rounded-2xl px-4 py-3 flex justify-between items-center">
          <span className="text-sm font-body text-brand-700">합계</span>
          <span className="font-display font-bold text-brand-700">{formatKRW(total)}</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-surface-800/30 font-body text-sm">불러오는 중...</div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-16 text-surface-800/30 font-body text-sm">내역이 없어요</div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-display font-semibold text-surface-800/40">
                  {dayjs(day).format('M월 D일 (dd)')}
                </p>
                <p className="text-xs font-body text-surface-800/40">
                  {formatKRW(items.reduce((s, e) => s + e.amount, 0))}
                </p>
              </div>
              {items.map(e => {
                const hasItems = e.expense_items && e.expense_items.length > 0
                const isExpanded = expandedId === e.id
                return (
                  <div key={e.id} className="bg-surface-0 rounded-2xl shadow-card overflow-hidden">
                    <div
                      className="flex items-center gap-3 px-4 py-3 group cursor-pointer active:bg-surface-50"
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
                          {e.photo_url && (
                            <a href={e.photo_url} target="_blank" rel="noreferrer"
                              className="text-xs text-brand-500" onClick={ev => ev.stopPropagation()}>📎</a>
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
          ))}
        </div>
      )}
    </div>
  )
}
