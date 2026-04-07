import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export default function AuthCallback() {
  const navigate = useNavigate()
  const { fetchHousehold } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchHousehold(session.user.id)
        const { data } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        navigate(data ? '/' : '/onboarding', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-brand-500 animate-pulse font-display">로그인 중...</div>
    </div>
  )
}
