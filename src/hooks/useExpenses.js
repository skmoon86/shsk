import { useState, useEffect, useCallback } from 'react'
import { supabase, withTimeout } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export function useExpenses(filters = {}) {
  const { household } = useAuthStore()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!household) return
    setLoading(true)
    try {
      let query = supabase
        .from('expenses')
        .select('*, categories(name, icon, color), expense_items(*)')
        .eq('household_id', household.id)
        .order('date', { ascending: false })

      if (filters.category_id) query = query.eq('category_id', filters.category_id)
      if (filters.from)        query = query.gte('date', filters.from)
      if (filters.to)          query = query.lte('date', filters.to)

      const { data, error } = await withTimeout(query, 15000, '지출 내역 조회')
      if (error) {
        console.error('[useExpenses.fetch]', error)
        toast.error('지출 내역을 불러오지 못했어요.')
      } else {
        setExpenses(data || [])
      }
    } catch (err) {
      console.error('[useExpenses.fetch]', err)
      toast.error(err?.message || '지출 내역을 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [household, filters.category_id, filters.from, filters.to])

  useEffect(() => { fetch() }, [fetch])

  const addExpense = async (payload, items = []) => {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('expenses')
          .insert({ ...payload, household_id: household.id })
          .select()
          .single(),
        15000,
        '지출 저장'
      )
      if (error) { console.error('[addExpense]', error); toast.error('저장에 실패했어요.'); return false }

      if (items.length > 0) {
        const { error: itemErr } = await withTimeout(
          supabase
            .from('expense_items')
            .insert(items.map(i => ({ expense_id: data.id, name: i.name, quantity: i.quantity || 1, amount: i.amount }))),
          15000,
          '품목 저장'
        )
        if (itemErr) { console.error('[addExpense items]', itemErr); toast.error('품목 저장에 실패했어요.'); return false }
      }

      toast.success('기록했어요!')
      // 목록 갱신은 백그라운드로. 실패해도 저장 자체는 성공이므로 await하지 않는다.
      fetch().catch(err => console.error('[addExpense refetch]', err))
      return true
    } catch (err) {
      console.error('[addExpense]', err)
      toast.error(err?.message || '저장에 실패했어요.')
      return false
    }
  }

  const updateExpense = async (id, payload, items = null) => {
    try {
      const { error } = await withTimeout(
        supabase.from('expenses').update(payload).eq('id', id),
        15000,
        '지출 수정'
      )
      if (error) { console.error('[updateExpense]', error); toast.error('수정에 실패했어요.'); return false }

      // If items provided, replace all existing items
      if (items !== null) {
        await withTimeout(
          supabase.from('expense_items').delete().eq('expense_id', id),
          15000,
          '품목 정리'
        )
        if (items.length > 0) {
          const { error: itemErr } = await withTimeout(
            supabase
              .from('expense_items')
              .insert(items.map(i => ({ expense_id: id, name: i.name, quantity: i.quantity || 1, amount: i.amount }))),
            15000,
            '품목 저장'
          )
          if (itemErr) { console.error('[updateExpense items]', itemErr); toast.error('품목 수정에 실패했어요.'); return false }
        }
      }

      toast.success('수정했어요!')
      fetch().catch(err => console.error('[updateExpense refetch]', err))
      return true
    } catch (err) {
      console.error('[updateExpense]', err)
      toast.error(err?.message || '수정에 실패했어요.')
      return false
    }
  }

  const deleteExpense = async (id) => {
    try {
      const { error } = await withTimeout(
        supabase.from('expenses').delete().eq('id', id),
        15000,
        '지출 삭제'
      )
      if (error) { console.error('[deleteExpense]', error); toast.error('삭제에 실패했어요.'); return false }
      toast.success('삭제했어요.')
      fetch().catch(err => console.error('[deleteExpense refetch]', err))
      return true
    } catch (err) {
      console.error('[deleteExpense]', err)
      toast.error(err?.message || '삭제에 실패했어요.')
      return false
    }
  }

  return { expenses, loading, refetch: fetch, addExpense, updateExpense, deleteExpense }
}
