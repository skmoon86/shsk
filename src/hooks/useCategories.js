import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import toast from 'react-hot-toast'

export function useCategories() {
  const { household } = useAuthStore()
  const [categories, setCategories] = useState([])

  const fetch = useCallback(() => {
    if (!household) return
    supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [household])

  useEffect(() => { fetch() }, [fetch])

  const addCategory = async (name) => {
    if (!household) return null
    const { data, error } = await supabase
      .from('categories')
      .insert({ household_id: household.id, name, icon: '📦', color: '#94a3b8' })
      .select()
      .single()
    if (error) { toast.error('카테고리 추가에 실패했어요.'); return null }
    await fetch()
    return data
  }

  const deleteCategory = async (id) => {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) { toast.error('카테고리 삭제에 실패했어요.'); return false }
    toast.success('카테고리를 삭제했어요.')
    await fetch()
    return true
  }

  return { categories, addCategory, deleteCategory, refetchCategories: fetch }
}
