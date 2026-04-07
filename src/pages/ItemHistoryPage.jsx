import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import dayjs from 'dayjs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

function formatKRW(n) { return n.toLocaleString('ko-KR') + '원' }

export default function ItemHistoryPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { household } = useAuthStore()
  const itemName = searchParams.get('name') || ''

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!household || !itemName) return
    setLoading(true)

    supabase
      .from('expense_items')
      .select('id, name, amount, created_at, expenses!inner(id, date, memo, household_id, categories(name, icon, color))')
      .eq('expenses.household_id', household.id)
      .eq('name', itemName)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setRecords(data || [])
        setLoading(false)
      })
  }, [household, itemName])

  const stats = useMemo(() => {
    if (records.length === 0) return null
    const amounts = records.map(r => r.amount)
    const total = amounts.reduce((s, a) => s + a, 0)
    const avg = Math.round(total / amounts.length)
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)
    const latest = amounts[0]
    const prev = amounts[1]
    return { total, avg, min, max, count: amounts.length, latest, prev }
  }, [records])

  const trend = stats && stats.prev != null
    ? stats.latest > stats.prev ? 'up' : stats.latest < stats.prev ? 'down' : 'same'
    : null

  return (
    <div className="px-5 pt-8 pb-4 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-1.5 rounded-xl hover:bg-surface-100 transition-colors">
          <ArrowLeft size={20} className="text-surface-800" />
        </button>
        <div>
          <h1 className="text-xl font-display font-bold text-surface-900">{itemName}</h1>
          <p className="text-xs font-body text-surface-800/40">과거 구매 내역</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-surface-800/30 font-body text-sm">불러오는 중...</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-surface-800/30 font-body text-sm">구매 내역이 없어요</div>
      ) : (
        <>
          {/* Stats card */}
          {stats && (
            <div className="bg-brand-50 rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-body text-brand-600/60">총 구매</p>
                  <p className="font-display font-bold text-brand-700">{stats.count}회</p>
                </div>
                <div>
                  <p className="text-[11px] font-body text-brand-600/60">평균 가격</p>
                  <p className="font-display font-bold text-brand-700">{formatKRW(stats.avg)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-body text-brand-600/60">최저가</p>
                  <p className="font-display font-semibold text-green-600">{formatKRW(stats.min)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-body text-brand-600/60">최고가</p>
                  <p className="font-display font-semibold text-red-500">{formatKRW(stats.max)}</p>
                </div>
              </div>
              {trend && (
                <div className="flex items-center gap-1.5 pt-2 border-t border-brand-200/50">
                  {trend === 'up' && <TrendingUp size={14} className="text-red-500" />}
                  {trend === 'down' && <TrendingDown size={14} className="text-green-600" />}
                  {trend === 'same' && <Minus size={14} className="text-surface-800/40" />}
                  <span className="text-xs font-body text-brand-700">
                    {trend === 'up' && `지난번보다 ${formatKRW(stats.latest - stats.prev)} 올랐어요`}
                    {trend === 'down' && `지난번보다 ${formatKRW(stats.prev - stats.latest)} 내렸어요`}
                    {trend === 'same' && '지난번과 같은 가격이에요'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* History list */}
          <div className="space-y-2">
            <h2 className="text-sm font-display font-semibold text-surface-800/50">구매 이력</h2>
            {records.map(r => {
              const expense = r.expenses
              const cat = expense?.categories
              return (
                <div key={r.id} className="flex items-center gap-3 bg-surface-0 rounded-2xl px-4 py-3 shadow-card">
                  <span className="text-xl">{cat?.icon || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-surface-900 truncate">
                      {expense?.memo || cat?.name || ''}
                    </p>
                    <p className="text-xs text-surface-800/40">
                      {dayjs(expense?.date).format('YYYY.M.D (dd)')}
                    </p>
                  </div>
                  <span className="font-display font-semibold text-sm">{formatKRW(r.amount)}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
