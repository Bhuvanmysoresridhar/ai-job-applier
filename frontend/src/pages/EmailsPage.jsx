import { useEffect, useState } from 'react'
import { Mail, Loader2, RefreshCw, Link2, Calendar, CheckCircle2, XCircle, AlertCircle, Inbox } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const classificationConfig = {
  rejection:            { label: 'Rejected',           icon: XCircle,       color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  interview_scheduled:  { label: 'Interview Scheduled', icon: Calendar,      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  assessment:           { label: 'Assessment',          icon: AlertCircle,   color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  follow_up:            { label: 'Follow Up',           icon: Mail,          color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  offer:                { label: '🏆 Offer!',           icon: CheckCircle2,  color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  unknown:              { label: 'General',             icon: Mail,          color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
}

export default function EmailsPage() {
  const { API_BASE } = useAuth()
  const [updates, setUpdates] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')

  const fetchUpdates = () =>
    axios.get(`${API_BASE}/api/email/updates`)
      .then(r => setUpdates(r.data.updates || []))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { fetchUpdates() }, [])

  const scanInbox = async () => {
    setError('')
    setScanning(true)
    try {
      const res = await axios.post(`${API_BASE}/api/email/scan`)
      await fetchUpdates()
    } catch (err) {
      const detail = err.response?.data?.detail || 'Scan failed'
      if (detail.includes('Gmail not connected')) {
        const gmailRes = await axios.get(`${API_BASE}/api/email/connect`)
        window.open(gmailRes.data.auth_url, '_blank')
        setError('Gmail not connected. A browser window opened for you to connect your Gmail account.')
      } else {
        setError(detail)
      }
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Updates</h1>
          <p className="text-slate-400 text-sm mt-1">AI monitors your inbox for job-related emails</p>
        </div>
        <button
          onClick={scanInbox}
          disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-medium transition-all"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {scanning ? 'Scanning...' : 'Scan Inbox'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/15">
        <div className="flex items-start gap-3">
          <Link2 className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-white mb-1">Connect Gmail to monitor your inbox</p>
            <p className="text-xs text-slate-400">Click "Scan Inbox" to connect Gmail via OAuth and start detecting interview invites, rejections, and offers.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 text-slate-600 animate-spin mx-auto" /></div>
      ) : updates.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No email updates yet</p>
          <p className="text-slate-600 text-xs mt-1">Connect Gmail and scan your inbox to see updates here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((update, i) => {
            const cfg = classificationConfig[update.classification] || classificationConfig.unknown
            const Icon = cfg.icon
            return (
              <div key={i} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm truncate">{update.subject}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">{update.sender} · {update.date}</p>
                    <p className="text-sm text-slate-300">{update.summary}</p>

                    {update.job_title && (
                      <p className="text-xs text-slate-500 mt-2">
                        Application: <span className="text-slate-300">{update.job_title}</span> at <span className="text-slate-300">{update.company}</span>
                      </p>
                    )}

                    {update.action_required && update.action_description && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-orange-300">{update.action_description}</p>
                      </div>
                    )}

                    {update.key_info?.interview_date && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-purple-400">
                        <Calendar className="w-3 h-3" />
                        <span>Interview: {update.key_info.interview_date} {update.key_info.interview_time || ''}</span>
                        {update.key_info.interview_format && <span className="capitalize">({update.key_info.interview_format})</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
