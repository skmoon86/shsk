import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, List, BarChart2, Settings } from 'lucide-react'

const navItems = [
  { to: '/',        icon: LayoutDashboard, label: '홈' },
  { to: '/history', icon: List,            label: '내역' },
  { to: '/add',     icon: PlusCircle,      label: '입력', primary: true },
  { to: '/stats',   icon: BarChart2,       label: '통계' },
  { to: '/settings',icon: Settings,        label: '설정' },
]

export default function AppLayout() {
  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-surface-0 shadow-float">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface-0 border-t border-surface-100 flex items-center justify-around px-2 py-2 z-50">
        {navItems.map(({ to, icon: Icon, label, primary }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              primary
                ? 'flex flex-col items-center -mt-5'
                : `flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all text-xs font-body ${
                    isActive ? 'text-brand-600 font-medium' : 'text-surface-800/40'
                  }`
            }
          >
            {({ isActive }) =>
              primary ? (
                <span className="bg-brand-500 text-white rounded-2xl p-3 shadow-float">
                  <Icon size={24} />
                </span>
              ) : (
                <>
                  <Icon size={20} strokeWidth={isActive ? 2.2 : 1.6} />
                  <span>{label}</span>
                </>
              )
            }
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
