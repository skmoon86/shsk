import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export function useExpenses(filters = {}) {
  const { household } = useAuthStore()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!household) return
    setLoading(true)
    let query = supabase
      .from('expenses')
      .select('*, categories(name, icon, color), expense_items(*)')
      .eq('household_id', household.id)
      .order('date', { ascending: false })

    if (filters.category_id) query = query.eq('category_id', filters.category_id)
    if (filters.from)        query = query.gte('date', filters.from)
    if (filters.to)          query = query.lte('date', filters.to)

    const { data, error } = await query
    if (error) toast.error('지출 내역을 불러오지 못했어요.')
    else setExpenses(data || [])
    setLoading(false)
  }, [household, filters.category_id, filters.from, filters.to])

  useEffect(() => { fetch() }, [fetch])

  const addExpense = async (payload, items = []) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...payload, household_id: household.id })
      .select()
      .single()
    if (error) { toast.error('저장에 실패했어요.'); return false }

    if (items.length > 0) {
      const { error: itemErr } = await supabase
        .from('expense_items')
        .insert(items.map(i => ({ expense_id: data.id, name: i.name, quantity: i.quantity || 1, amount: i.amount })))
      if (itemErr) { toast.error('품목 저장에 실패했어요.'); return false }
    }

    toast.success('기록했어요!')
    await fetch()
    return true
  }

  const updateExpense = async (id, payload, items = null) => {
    const { error } = await supabase.from('expenses').update(payload).eq('id', id)
    if (error) { toast.error('수정에 실패했어요.'); return false }

    // If items provided, replace all existing items
    if (items !== null) {
      await supabase.from('expense_items').delete().eq('expense_id', id)
      if (items.length > 0) {
        const { error: itemErr } = await supabase
          .from('expense_items')
          .insert(items.map(i => ({ expense_id: id, name: i.name, quantity: i.quantity || 1, amount: i.amount })))
        if (itemErr) { toast.error('품목 수정에 실패했어요.'); return false }
      }
    }

    toast.success('수정했어요!')
    await fetch()
    return true
  }

  const deleteExpense = async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error('삭제에 실패했어요.'); return false }
    toast.success('삭제했어요.')
    await fetch()
    return true
  }

  return { expenses, loading, refetch: fetch, addExpense, updateExpense, deleteExpense }
}
