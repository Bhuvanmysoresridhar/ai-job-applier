import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Send, CheckCircle2, Clock, XCircle, Calendar, ArrowRight, Zap, Bell } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const StatCard = ({ icon: Icon, label, value, color, bg }) => (
  <div className={`p-5 rounded-2xl border ${bg} ${color} border-white/5`}>
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-slate-400 font-medium">{label}</p>
      <Icon className={`w-5 h-5 opacity-60`} />
    </div>
    <p className="text-3xl font-bold text-white">{value}</p>
  </div>
)

const statusColors = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  in_progress: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  applied: 'text-green-400 bg-green-400/10 border-green-400/20',
  needs_info: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  rejected: 'text-red-400 bg-red-400/10 border-red-400/20',
  interview_scheduled: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  offer_received: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  failed: 'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function DashboardHome() {
  const { API_BASE } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get(`${API_BASE}/api/jobs/my-applications`)
      .then(r => setApplications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const stats = {
    total: applications.length,
    applied: applications.filter(a => a.status === 'applied').length,
    interviews: applications.filter(a => a.status === 'interview_scheduled').length,
    pending: applications.filter(a => ['pending', 'in_progress', 'needs_info'].includes(a.status)).length,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Your AI job application command center</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Briefcase} label="Total Applications" value={stats.total} bg="bg-slate-900/60" color="text-blue-400" />
        <StatCard icon={CheckCircle2} label="Successfully Applied" value={stats.applied} bg="bg-green-500/5" color="text-green-400" />
        <StatCard icon={Calendar} label="Interviews" value={stats.interviews} bg="bg-purple-500/5" color="text-purple-400" />
        <StatCard icon={Clock} label="In Progress" value={stats.pending} bg="bg-orange-500/5" color="text-orange-400" />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          { to: '/dashboard/jobs', icon: Zap, title: 'Discover Jobs', desc: 'AI finds best-match jobs for you', color: 'from-blue-600/20 to-blue-600/5', border: 'border-blue-500/20', iconColor: 'text-blue-400' },
          { to: '/dashboard/resume', icon: Send, title: 'Upload Resume', desc: 'Get AI feedback and approval', color: 'from-orange-600/20 to-orange-600/5', border: 'border-orange-500/20', iconColor: 'text-orange-400' },
          { to: '/dashboard/emails', icon: Bell, title: 'Email Updates', desc: 'Check interview invites & rejections', color: 'from-purple-600/20 to-purple-600/5', border: 'border-purple-500/20', iconColor: 'text-purple-400' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`p-5 rounded-2xl bg-gradient-to-br ${item.color} border ${item.border} hover:scale-[1.02] transition-all group`}
          >
            <item.icon className={`w-6 h-6 ${item.iconColor} mb-3`} />
            <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
            <p className="text-slate-400 text-xs">{item.desc}</p>
            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white mt-3 transition-colors" />
          </Link>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white">Recent Applications</h2>
          <Link to="/dashboard/applications" className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm text-center py-8">Loading...</div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No applications yet</p>
            <Link to="/dashboard/jobs" className="text-blue-400 text-sm hover:text-blue-300 mt-2 inline-block">
              Discover jobs →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 5).map(app => (
              <div key={app.application_id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-white/5 hover:border-white/10 transition-all">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{app.job_title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{app.company}</p>
                </div>
                <span className={`ml-3 flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[app.status] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                  {app.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
