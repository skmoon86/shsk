import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  household: null,
  loading: true,

  setUser: (user) => set({ user }),
  setHousehold: (household) => set({ household }),

  init: async () => {
    set({ loading: true })
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().fetchHousehold(session.user.id)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        await get().fetchHousehold(session.user.id)
      } else {
        set({ user: null, household: null })
      }
    })
  },

  fetchHousehold: async (userId) => {
    const { data } = await supabase
      .from('memberships')
      .select('households(*)')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.households) {
      set({ household: data.households })
    }
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, household: null })
  },
}))
