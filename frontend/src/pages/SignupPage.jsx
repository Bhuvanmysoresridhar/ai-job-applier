import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Mail, Lock, User, Eye, EyeOff, Loader2, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await signup(form.email, form.full_name, form.password)
      navigate('/profile/setup')
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    'AI applies to 50+ jobs daily on your behalf',
    'Resume reviewed and optimized by GPT-4o',
    'Email inbox monitored for interview invites',
    'Real-time notifications when AI needs help',
  ]

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl grid md:grid-cols-2 gap-12 items-center">
        {/* Left — Benefits */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-md">
              <ChevronRight className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              BEAM<span className="text-blue-400">.jobs</span>
            </span>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Your personal<br />
            <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">job application</span><br />
            army of one.
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Set up your profile once. Our AI agents handle the rest — applying to the right jobs, every single day.
          </p>

          <div className="space-y-4">
            {benefits.map((b, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-3 h-3 text-orange-400" />
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{b}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div>
          <div className="flex items-center gap-2 mb-8 md:hidden justify-center">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-md">
              <ChevronRight className="w-5 h-5 text-blue-400" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">BEAM<span className="text-blue-400">.jobs</span></span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8">
            <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
            <p className="text-slate-400 text-sm mb-8">Start your AI-powered job search today</p>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-slate-300 font-medium mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="you@university.edu"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-300 font-medium mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold text-sm tracking-wide transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Creating account...' : 'Create Free Account →'}
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
