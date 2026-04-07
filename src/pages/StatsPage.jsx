import { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import dayjs from 'dayjs'
import { useExpenses } from '@/hooks/useExpenses'

function formatKRW(n) { return n.toLocaleString('ko-KR') + '원' }

const PERIODS = [
  { label: '이번 달', from: dayjs().startOf('month').format('YYYY-MM-DD'), to: dayjs().endOf('month').format('YYYY-MM-DD') },
  { label: '지난 달', from: dayjs().subtract(1,'month').startOf('month').format('YYYY-MM-DD'), to: dayjs().subtract(1,'month').endOf('month').format('YYYY-MM-DD') },
  { label: '3개월',   from: dayjs().subtract(2,'month').startOf('month').format('YYYY-MM-DD'), to: dayjs().endOf('month').format('YYYY-MM-DD') },
]

export default function StatsPage() {
  const [periodIdx, setPeriodIdx] = useState(0)
  const period = PERIODS[periodIdx]
  const { expenses, loading } = useExpenses({ from: period.from, to: period.to })

  const byCategory = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const key = e.categories?.name || '기타'
      const color = e.categories?.color || '#94a3b8'
      const icon = e.categories?.icon || '📦'
      if (!map[key]) map[key] = { name: key, color, icon, value: 0 }
      map[key].value += e.amount
    }
    return Object.values(map).sort((a, b) => b.value - a.value)
  }, [expenses])

  const byMonth = useMemo(() => {
    const map = {}
    for (const e of expenses) {
      const m = dayjs(e.date).format('M월')
      if (!map[m]) map[m] = { month: m, total: 0 }
      map[m].total += e.amount
    }
    return Object.values(map)
  }, [expenses])

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses])

  return (
    <div className="px-5 pt-8 pb-4 space-y-6">
      <h1 className="text-2xl font-display font-bold">통계</h1>

      {/* Period selector */}
      <div className="flex gap-1 bg-surface-100 rounded-2xl p-1">
        {PERIODS.map((p, i) => (
          <button key={p.label} onClick={() => setPeriodIdx(i)}
            className={`flex-1 py-2 rounded-xl text-xs font-display font-semibold transition-all ${
              periodIdx === i ? 'bg-surface-0 shadow-card text-surface-900' : 'text-surface-800/40'
            }`}>{p.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-surface-800/30 font-body text-sm">불러오는 중...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16 text-surface-800/30 font-body text-sm">해당 기간 내역이 없어요</div>
      ) : (
        <>
          {/* Total */}
          <div className="bg-surface-0 rounded-3xl p-5 shadow-card text-center">
            <p className="text-xs font-body text-surface-800/40 mb-1">총 지출</p>
            <p className="text-3xl font-display font-bold text-surface-900">{formatKRW(total)}</p>
          </div>

          {/* Pie chart */}
          {byCategory.length > 0 && (
            <div className="bg-surface-0 rounded-3xl p-5 shadow-card space-y-4">
              <h2 className="text-sm font-display font-semibold text-surface-800/50">카테고리별 비율</h2>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatKRW(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {byCategory.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-body flex-1">{cat.icon} {cat.name}</span>
                    <span className="text-sm font-display font-semibold">{formatKRW(cat.value)}</span>
                    <span className="text-xs font-body text-surface-800/40 w-10 text-right">
                      {Math.round((cat.value / total) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bar chart (monthly) */}
          {byMonth.length > 1 && (
            <div className="bg-surface-0 rounded-3xl p-5 shadow-card space-y-4">
              <h2 className="text-sm font-display font-semibold text-surface-800/50">월별 지출</h2>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={byMonth} barSize={32}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(v) => formatKRW(v)} />
                  <Bar dataKey="total" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
