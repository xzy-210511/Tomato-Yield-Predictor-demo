import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, KeyRound, User as UserIcon } from 'lucide-react'
import { loginUser, registerUser } from '../api/auth'
import TopNav from '../components/TopNav'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    document.body.classList.add('theme-dark')
    return () => document.body.classList.remove('theme-dark')
  }, [])

  const handleSubmit = async () => {
    setError('')
    const trimmedUsername = username.trim()
    if (!trimmedUsername || !password) {
      setError('Please enter username and password')
      return
    }

    setLoading(true)
    try {
      const authAction = isLogin ? loginUser : registerUser
      const user = await authAction({ username: trimmedUsername, password })
      localStorage.setItem('user', user.username)
      localStorage.setItem('userId', String(user.userId))
      navigate('/workspace')
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-hero-radial">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink-950 to-transparent" />

      <TopNav variant="dark" />

      <div className="relative z-10 flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px] space-y-8 rounded-3xl border border-ink-700 bg-ink-900/85 p-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl">

          <div className="space-y-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.36em] text-brand-500">
              Hydro · Living Lab
            </p>
            <h2 className="text-3xl font-black tracking-tight text-slate-100">
              {isLogin ? 'Welcome Back' : 'Join the Lab'}
            </h2>
          </div>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Username
              </label>
              <div className="relative">
                <UserIcon size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="hydro_op"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                Password
              </label>
              <div className="relative">
                <KeyRound size={14} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-ink-700 bg-ink-850/80 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-100 placeholder:text-slate-600 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-red-700/60 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-300">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-[12px] font-black uppercase tracking-[0.22em] text-white transition-all hover:bg-brand-500 hover:shadow-[0_8px_24px_-6px_rgba(34,197,94,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Please Wait...' : isLogin ? 'Sign In' : 'Create Account'}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="border-t border-ink-700/60 pt-4 text-center">
            <p className="text-xs font-semibold text-slate-400">
              {isLogin ? "Don't have an account?" : 'Already a member?'}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 font-black uppercase tracking-wider text-brand-500 transition-colors hover:text-brand-400 hover:underline underline-offset-4"
              >
                {isLogin ? 'Register' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
