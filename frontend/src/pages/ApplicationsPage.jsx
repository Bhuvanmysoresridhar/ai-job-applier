import { useEffect, useState } from 'react'
import { Send, Loader2, ExternalLink, AlertCircle, MessageSquare, CheckCircle2, X, Clock } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const statusConfig = {
  pending:             { label: 'Pending',            color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  in_progress:         { label: 'In Progress',        color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  applied:             { label: 'Applied ✓',          color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  needs_info:          { label: '⚠️ Needs Info',      color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  rejected:            { label: 'Rejected',           color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  interview_scheduled: { label: '🎉 Interview!',      color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  offer_received:      { label: '🏆 Offer!',          color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  failed:              { label: 'Failed',             color: 'text-red-400 bg-red-400/10 border-red-400/20' },
}

export default function ApplicationsPage() {
  const { API_BASE } = useAuth()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState({})
  const [answerModal, setAnswerModal] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetchApplications = () =>
    axios.get(`${API_BASE}/api/jobs/my-applications`)
      .then(r => setApplications(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => { fetchApplications() }, [])

  const startApply = async (appId) => {
    setStarting(s => ({ ...s, [appId]: true }))
    try {
      await axios.post(`${API_BASE}/api/apply/start/${appId}`)
      await fetchApplications()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to start')
    } finally {
      setStarting(s => ({ ...s, [appId]: false }))
    }
  }

  const submitAnswers = async () => {
    setSubmitting(true)
    try {
      await axios.post(`${API_BASE}/api/apply/answer/${answerModal.application_id}`, { answers })
      setAnswerModal(null)
      setAnswers({})
      await fetchApplications()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit answers')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Applications</h1>
        <p className="text-slate-400 text-sm mt-1">Track every job application and trigger AI auto-apply</p>
      </div>

      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-8 h-8 text-slate-600 animate-spin mx-auto" /></div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16">
          <Send className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No applications yet</p>
          <p className="text-slate-600 text-xs mt-1">Go to Discover Jobs and click Auto-Apply</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(app => {
            const cfg = statusConfig[app.status] || { label: app.status, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' }
            return (
              <div key={app.application_id} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white text-sm">{app.job_title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">{app.company}</p>
                    {app.applied_at && (
                      <p className="text-xs text-slate-600 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Applied {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                    )}
                    {app.match_score && (
                      <p className="text-xs text-slate-500 mt-1">Match Score: <span className="text-blue-400 font-medium">{app.match_score}/100</span></p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <a href={app.application_url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-500 hover:text-white transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    {app.status === 'pending' && (
                      <button onClick={() => startApply(app.application_id)} disabled={starting[app.application_id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium transition-all disabled:opacity-60">
                        {starting[app.application_id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Start AI Apply
                      </button>
                    )}

                    {app.status === 'needs_info' && (
                      <button onClick={() => { setAnswerModal(app); setAnswers({}) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-500/40 text-orange-400 text-xs font-medium transition-all hover:bg-orange-500/30">
                        <MessageSquare className="w-3 h-3" />
                        Answer Questions
                      </button>
                    )}
                  </div>
                </div>

                {app.email_updates?.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
                    {app.email_updates.slice(0, 2).map((u, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                        <p className="text-slate-400">{u.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Answer Modal */}
      {answerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-white">AI Needs Your Help</h2>
              <button onClick={() => setAnswerModal(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-5">The AI agent paused while applying to <strong className="text-white">{answerModal.job_title}</strong> at <strong className="text-white">{answerModal.company}</strong> and needs answers:</p>

            <div className="space-y-4 mb-6">
              {answerModal.pending_questions?.map((q, i) => (
                <div key={i}>
                  <label className="block text-sm text-slate-300 mb-1.5">{q.question}</label>
                  <input
                    type="text"
                    value={answers[q.field] || ''}
                    onChange={e => setAnswers(a => ({ ...a, [q.field]: e.target.value }))}
                    placeholder="Your answer..."
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setAnswerModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={submitAnswers} disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Submit & Resume Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
