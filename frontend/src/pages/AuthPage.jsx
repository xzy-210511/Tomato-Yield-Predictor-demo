import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react' 
import { loginUser, registerUser } from '../api/auth'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()

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
      navigate('/')
    } catch (e) {
      setError(e.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      
      <div className="absolute top-8 left-8">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 rounded-full 
                     text-slate-600 font-bold text-sm shadow-sm hover:shadow-md 
                     hover:bg-slate-900 hover:text-white hover:border-slate-900
                     transition-all duration-300 group active:scale-95"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          BACK
        </button>
      </div>

      <div className="bg-white p-10 rounded-[2rem] shadow-xl w-full max-w-[450px] space-y-8 border border-slate-100">
        
        <div className="space-y-2 text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Join Us'}
          </h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-slate-200 p-3.5 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-slate-200 p-3.5 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all bg-slate-50/50"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <div className="pt-2">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-[0.98]"
            >
            {loading ? 'Please Wait...' : isLogin ? 'Sign In' : 'Create Your Account'}
          </button>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-center text-sm text-slate-500 font-medium">
            {isLogin ? "Don't have an account?" : "Already a member?"}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="ml-2 text-emerald-600 hover:text-emerald-700 font-bold hover:underline underline-offset-4"
            >
              {isLogin ? 'Register Now' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
