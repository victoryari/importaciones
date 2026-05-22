import { useState } from 'react'
import { useAuth } from '../auth'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">App Conductor</h1>
          <p className="text-sm text-blue-200 mt-1 font-medium">Importaciones Carmelita</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-3xl p-6 space-y-4 border border-white/10">
          <div>
            <label className="text-xs font-bold text-blue-200 uppercase tracking-widest ml-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 font-bold outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              placeholder="conductor@email.com"
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-blue-200 uppercase tracking-widest ml-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-blue-200/50 font-bold outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-red-300 text-sm font-bold text-center bg-red-500/10 rounded-xl px-4 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-500 hover:bg-blue-400 disabled:bg-slate-600 disabled:text-slate-400 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-500/25 text-sm uppercase tracking-widest"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
