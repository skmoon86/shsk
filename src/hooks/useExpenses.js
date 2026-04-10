import { useState, useEffect, useCallback } from 'react'
import { supabase, withTimeout, xhrRest } from '@/lib/supabase'
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
      // Supabase JS SDK의 fetch POST가 삼성 인터넷 일부 버전에서
      // hang 걸리는 이슈 때문에 XHR로 PostgREST REST API를 직접 호출.
      const inserted = await xhrRest('POST', '/rest/v1/expenses', {
        body: { ...payload, household_id: household.id },
        prefer: 'return=representation',
      })
      const data = Array.isArray(inserted) ? inserted[0] : inserted
      if (!data?.id) throw new Error('저장 응답이 비어 있어요')

      if (items.length > 0) {
        await xhrRest('POST', '/rest/v1/expense_items', {
          body: items.map(i => ({ expense_id: data.id, name: i.name, quantity: i.quantity || 1, amount: i.amount })),
        })
      }

      toast.success('기록했어요!')
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
      await xhrRest('PATCH', '/rest/v1/expenses', {
        body: payload,
        query: { id: `eq.${id}` },
      })

      if (items !== null) {
        await xhrRest('DELETE', '/rest/v1/expense_items', {
          query: { expense_id: `eq.${id}` },
        })
        if (items.length > 0) {
          await xhrRest('POST', '/rest/v1/expense_items', {
            body: items.map(i => ({ expense_id: id, name: i.name, quantity: i.quantity || 1, amount: i.amount })),
          })
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
      await xhrRest('DELETE', '/rest/v1/expenses', { query: { id: `eq.${id}` } })
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
