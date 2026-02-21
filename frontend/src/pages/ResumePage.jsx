import { useState, useEffect } from 'react'
import { Upload, FileText, CheckCircle2, AlertCircle, Star, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const ScoreRing = ({ score }) => {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444'
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="8" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold text-white">{score}</p>
        <p className="text-xs text-slate-500">/ 100</p>
      </div>
    </div>
  )
}

export default function ResumePage() {
  const { API_BASE } = useAuth()
  const [resumes, setResumes] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState('')

  const fetchResumes = () =>
    axios.get(`${API_BASE}/api/resume/my-resumes`).then(r => setResumes(r.data)).catch(() => {})

  useEffect(() => { fetchResumes() }, [])

  const handleUpload = async (file) => {
    if (!file) return
    setError('')
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post(`${API_BASE}/api/resume/upload`, form)
      await fetchResumes()
      handleAnalyze(res.data.resume_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
      setUploading(false)
    }
  }

  const handleAnalyze = async (resumeId) => {
    setAnalyzing(resumeId)
    setUploading(false)
    try {
      await axios.post(`${API_BASE}/api/resume/${resumeId}/analyze`)
      await fetchResumes()
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed')
    } finally {
      setAnalyzing(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Resume</h1>
        <p className="text-slate-400 text-sm mt-1">Upload your resume and get AI-powered feedback</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all mb-8 ${
          dragOver ? 'border-blue-400 bg-blue-500/5' : 'border-white/10 hover:border-white/20'
        }`}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          onChange={e => handleUpload(e.target.files[0])}
          disabled={uploading || !!analyzing}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-slate-300 font-medium">Uploading resume...</p>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 text-slate-500 mx-auto mb-4" />
            <p className="text-white font-semibold mb-1">Drag & drop your resume</p>
            <p className="text-slate-500 text-sm">or click to browse — PDF, DOC, DOCX supported</p>
          </>
        )}
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Resumes list */}
      {resumes.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-white">Your Resumes</h2>
          {resumes.map(resume => (
            <div key={resume.id} className="bg-slate-900/60 border border-white/5 rounded-2xl overflow-hidden">
              <div className="p-5 flex items-center gap-4">
                {analyzing === resume.id ? (
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                ) : resume.ai_score != null ? (
                  <div className="flex-shrink-0 scale-75 -ml-2">
                    <ScoreRing score={resume.ai_score} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-medium text-white text-sm truncate">{resume.filename}</p>
                    {resume.is_approved && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-xs border border-green-500/20">
                        <CheckCircle2 className="w-3 h-3" /> Approved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {analyzing === resume.id ? 'AI is analyzing your resume...' :
                     resume.ai_score != null ? `Score: ${resume.ai_score}/100 · ${resume.is_approved ? 'Ready to apply' : 'Needs improvement'}` :
                     'Click Analyze to get AI feedback'}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {resume.ai_score == null && !analyzing && (
                    <button
                      onClick={() => handleAnalyze(resume.id)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
                    >
                      Analyze
                    </button>
                  )}
                  {resume.ai_score != null && (
                    <button
                      onClick={() => setExpanded(expanded === resume.id ? null : resume.id)}
                      className="p-2 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
                    >
                      {expanded === resume.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded feedback */}
              {expanded === resume.id && resume.ai_score != null && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                  {resume.ai_feedback && (
                    <div className="grid md:grid-cols-2 gap-3">
                      {Object.entries(resume.ai_feedback).map(([key, val]) => (
                        <div key={key} className="p-3 rounded-xl bg-slate-800/60">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{key.replace('_', ' ')}</p>
                          <p className="text-sm text-slate-300">{val}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {resume.improvement_suggestions?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Improvement Suggestions</p>
                      <div className="space-y-2">
                        {resume.improvement_suggestions.slice(0, 5).map((s, i) => (
                          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                            s.priority === 'high' ? 'bg-red-500/5 border-red-500/20' :
                            s.priority === 'medium' ? 'bg-orange-500/5 border-orange-500/20' :
                            'bg-slate-800/40 border-white/5'
                          }`}>
                            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                              s.priority === 'high' ? 'text-red-400' :
                              s.priority === 'medium' ? 'text-orange-400' : 'text-slate-500'
                            }`} />
                            <div>
                              <p className="text-slate-300 font-medium">{s.section}</p>
                              <p className="text-slate-500 text-xs mt-0.5">{s.fix}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
