import { useState } from 'react'
import { Search, MapPin, ExternalLink, Zap, Loader2, Star, AlertCircle, CheckCircle2, Briefcase } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const recommendationColors = {
  strong_match: 'text-green-400 bg-green-400/10 border-green-400/20',
  good_match: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  stretch_goal: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  not_recommended: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
}

const recommendationLabels = {
  strong_match: '🔥 Strong Match',
  good_match: '✅ Good Match',
  stretch_goal: '📈 Stretch Goal',
  not_recommended: 'Low Match',
}

export default function JobsPage() {
  const { API_BASE } = useAuth()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(false)
  const [location, setLocation] = useState('United States')
  const [queueing, setQueueing] = useState({})
  const [queued, setQueued] = useState({})
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const discover = async () => {
    setError('')
    setLoading(true)
    setSearched(true)
    try {
      const res = await axios.get(`${API_BASE}/api/jobs/discover`, { params: { location, max_results: 10 } })
      setJobs(res.data.jobs || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to discover jobs. Make sure your profile is set up.')
    } finally {
      setLoading(false)
    }
  }

  const queueJob = async (job, idx) => {
    setQueueing(q => ({ ...q, [idx]: true }))
    try {
      const savedRes = await axios.get(`${API_BASE}/api/jobs/saved`)
      const saved = savedRes.data.find(j => j.application_url === job.application_url)
      if (saved) {
        await axios.post(`${API_BASE}/api/jobs/${saved.id}/queue`)
        setQueued(q => ({ ...q, [idx]: true }))
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to queue job')
    } finally {
      setQueueing(q => ({ ...q, [idx]: false }))
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Discover Jobs</h1>
        <p className="text-slate-400 text-sm mt-1">AI finds and scores the best jobs matching your profile</p>
      </div>

      {/* Search bar */}
      <div className="flex gap-3 mb-8">
        <div className="relative flex-1 max-w-sm">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Location (e.g. Remote, New York)"
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all"
          />
        </div>
        <button
          onClick={discover}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold text-sm transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {loading ? 'Discovering...' : 'Discover Jobs'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-slate-800 rounded w-1/4 mb-3" />
                  <div className="h-3 bg-slate-800 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job cards */}
      {!loading && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={idx} className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
              <div className="flex items-start gap-4">
                {/* Score badge */}
                <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border ${
                  job.match_score >= 70 ? 'bg-green-500/10 border-green-500/20' :
                  job.match_score >= 50 ? 'bg-blue-500/10 border-blue-500/20' :
                  'bg-slate-800 border-white/5'
                }`}>
                  <p className={`text-lg font-bold ${
                    job.match_score >= 70 ? 'text-green-400' :
                    job.match_score >= 50 ? 'text-blue-400' : 'text-slate-400'
                  }`}>{job.match_score}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-wide">match</p>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-white text-sm">{job.title}</h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${recommendationColors[job.apply_recommendation] || ''}`}>
                      {recommendationLabels[job.apply_recommendation] || job.apply_recommendation}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-1">{job.company}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="capitalize">{job.job_type?.replace('-', ' ')}</span>
                    <span className="capitalize">{job.source}</span>
                  </div>

                  {job.match_summary && (
                    <p className="text-slate-400 text-xs mb-3 leading-relaxed">{job.match_summary}</p>
                  )}

                  {job.match_reasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {job.match_reasons.slice(0, 3).map((r, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs border border-white/5">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => queueJob(job, idx)}
                      disabled={queueing[idx] || queued[idx]}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        queued[idx]
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-orange-500 hover:bg-orange-400 text-white'
                      } disabled:opacity-60`}
                    >
                      {queueing[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> :
                       queued[idx] ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                      {queued[idx] ? 'Queued!' : queueing[idx] ? 'Queueing...' : 'Auto-Apply'}
                    </button>
                    <a
                      href={job.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-xs font-medium transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View Job
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && searched && jobs.length === 0 && !error && (
        <div className="text-center py-16">
          <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No jobs found. Make sure your profile is set up with domain and skills.</p>
        </div>
      )}
    </div>
  )
}
