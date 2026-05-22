import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { to: '/workspace', label: 'Workspace' },
  { to: '/growth',    label: 'Growth' },
  { to: '/history',   label: 'History' },
  { to: '/login',     label: 'Login' },
]

export default function TopNav({ variant = 'dark' }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')

  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    setUsername(u || '')
  }, [pathname])

  const isDark = variant === 'dark'
  const baseBg = isDark
    ? 'bg-ink-950/70 border-ink-700/60 backdrop-blur-xl'
    : 'bg-white/80 border-slate-200 backdrop-blur-xl'
  const logoColor = isDark ? 'text-slate-100' : 'text-slate-900'
  const dotColor  = isDark ? 'bg-glow shadow-glow' : 'bg-brand-600'

  return (
    <header className={`pointer-events-auto sticky top-0 z-40 w-full border-b ${baseBg}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
        <Link to="/" className="group flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotColor} animate-glow-pulse`} />
          <span className={`text-sm font-black tracking-[0.32em] uppercase ${logoColor} group-hover:text-glow`}>
            Hydro
          </span>
          <span className="text-glow text-sm font-black text-glow">·</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.to || (item.to === '/workspace' && pathname === '/workspace/')
            const linkBase = 'relative px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] transition-colors'
            const linkColor = active
              ? (isDark ? 'text-glow' : 'text-brand-700')
              : (isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-500 hover:text-slate-900')
            return (
              <Link key={item.to} to={item.to} className={`${linkBase} ${linkColor}`}>
                {item.label}
                {active && (
                  <span
                    className={`pointer-events-none absolute inset-x-3 -bottom-0.5 h-px ${
                      isDark ? 'bg-glow shadow-glow' : 'bg-brand-600'
                    }`}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {username ? (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('user')
                localStorage.removeItem('userId')
                setUsername('')
                navigate('/login')
              }}
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                isDark
                  ? 'border-ink-700 text-slate-300 hover:border-glow hover:text-glow'
                  : 'border-slate-300 text-slate-600 hover:border-brand-600 hover:text-brand-700'
              }`}
              title={`Signed in as ${username}`}
            >
              {username.slice(0, 12)}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
