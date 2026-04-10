import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'

import LoginPage       from '@/pages/LoginPage'
import OnboardingPage  from '@/pages/OnboardingPage'
import AuthCallback    from '@/pages/AuthCallback'
import DashboardPage   from '@/pages/DashboardPage'
import AddExpensePage  from '@/pages/AddExpensePage'
import HistoryPage     from '@/pages/HistoryPage'
import StatsPage       from '@/pages/StatsPage'
import SettingsPage    from '@/pages/SettingsPage'
import ItemHistoryPage from '@/pages/ItemHistoryPage'
import AppLayout       from '@/components/layout/AppLayout'
import ErrorBoundary   from '@/components/ErrorBoundary'

function PrivateRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <div className="flex items-center justify-center h-screen text-brand-500">로딩 중...</div>
  return user ? children : <Navigate to="/login" replace />
}

function HouseholdRoute({ children }) {
  const { user, household, loading } = useAuthStore()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (!household) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 2500 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={
          <PrivateRoute><OnboardingPage /></PrivateRoute>
        } />
        <Route path="/" element={
          <HouseholdRoute><AppLayout /></HouseholdRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="add" element={<AddExpensePage />} />
          <Route path="edit/:id" element={<AddExpensePage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="item-history" element={<ItemHistoryPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}
