import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, X, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const DOMAINS = [
  { value: 'software_engineering', label: 'Software Engineering' },
  { value: 'data_science', label: 'Data Science' },
  { value: 'machine_learning', label: 'Machine Learning / AI' },
  { value: 'full_stack', label: 'Full Stack Development' },
  { value: 'frontend', label: 'Frontend Development' },
  { value: 'backend', label: 'Backend Development' },
  { value: 'devops', label: 'DevOps / Cloud' },
  { value: 'cloud_engineering', label: 'Cloud Engineering' },
  { value: 'cybersecurity', label: 'Cybersecurity' },
  { value: 'mobile', label: 'Mobile Development' },
  { value: 'ui_ux', label: 'UI/UX Design' },
  { value: 'qa_testing', label: 'QA / Testing' },
  { value: 'product_management', label: 'Product Management' },
  { value: 'other', label: 'Other' },
]

const EXPERIENCE_LEVELS = [
  { value: 'fresher', label: 'Fresher (No experience)', desc: 'Just graduated or about to graduate' },
  { value: 'internship', label: 'Intern / Co-op', desc: 'Looking for internship opportunities' },
  { value: 'entry_level', label: 'Entry Level (1-2 years)', desc: 'Have some experience or projects' },
  { value: 'mid_level', label: 'Mid Level (3-5 years)', desc: 'Professional experience in the field' },
]

const STEPS = ['Domain', 'Experience', 'Skills', 'Projects']

export default function ProfileSetupPage() {
  const { API_BASE } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    domain: '',
    experience_level: '',
    skills: [],
    skillInput: '',
    projects: [],
    location: '',
    linkedin_url: '',
    github_url: '',
  })

  const addSkill = () => {
    const s = form.skillInput.trim()
    if (s && !form.skills.includes(s)) {
      setForm(f => ({ ...f, skills: [...f.skills, s], skillInput: '' }))
    }
  }

  const removeSkill = (s) => setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }))

  const addProject = () => {
    setForm(f => ({
      ...f,
      projects: [...f.projects, { name: '', description: '', tech_stack: [], techInput: '' }],
    }))
  }

  const updateProject = (i, field, value) => {
    setForm(f => {
      const p = [...f.projects]
      p[i] = { ...p[i], [field]: value }
      return { ...f, projects: p }
    })
  }

  const addProjectTech = (i) => {
    const t = form.projects[i].techInput?.trim()
    if (t && !form.projects[i].tech_stack.includes(t)) {
      updateProject(i, 'tech_stack', [...form.projects[i].tech_stack, t])
      updateProject(i, 'techInput', '')
    }
  }

  const removeProject = (i) => setForm(f => ({ ...f, projects: f.projects.filter((_, idx) => idx !== i) }))

  const canNext = () => {
    if (step === 0) return !!form.domain
    if (step === 1) return !!form.experience_level
    if (step === 2) return form.skills.length >= 1
    return true
  }

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      await axios.post(`${API_BASE}/api/profile/setup`, {
        domain: form.domain,
        experience_level: form.experience_level,
        skills: form.skills,
        projects: form.projects.filter(p => p.name).map(p => ({
          name: p.name, description: p.description, tech_stack: p.tech_stack,
        })),
        location: form.location || null,
        linkedin_url: form.linkedin_url || null,
        github_url: form.github_url || null,
        target_roles: [],
        preferred_job_types: ['full-time', 'remote', 'internship'],
      })
      navigate('/dashboard')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail?.includes('already exists')) navigate('/dashboard')
      else setError(detail || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0f1c] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="flex items-center justify-center w-7 h-7 bg-blue-500/20 border border-blue-500/40 rounded-md">
            <ChevronRight className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">BEAM<span className="text-blue-400">.jobs</span></span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all ${
                i < step ? 'bg-blue-600 text-white' :
                i === step ? 'bg-blue-600/20 border-2 border-blue-500 text-blue-400' :
                'bg-slate-800 text-slate-500'
              }`}>{i < step ? '✓' : i + 1}</div>
              {i < STEPS.length - 1 && <div className={`w-12 h-0.5 rounded ${i < step ? 'bg-blue-600' : 'bg-slate-800'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/8 rounded-2xl p-8">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
          )}

          {/* Step 0: Domain */}
          {step === 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Choose your domain</h2>
              <p className="text-slate-400 text-sm mb-6">What type of jobs do you want AI to apply for?</p>
              <div className="grid grid-cols-2 gap-2">
                {DOMAINS.map(d => (
                  <button key={d.value} onClick={() => setForm(f => ({ ...f, domain: d.value }))}
                    className={`px-4 py-3 rounded-xl text-sm font-medium text-left transition-all border ${
                      form.domain === d.value
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                        : 'bg-slate-800/60 border-white/5 text-slate-300 hover:border-white/15'
                    }`}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Experience */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Your experience level</h2>
              <p className="text-slate-400 text-sm mb-6">This helps AI target the right job listings for you</p>
              <div className="space-y-3">
                {EXPERIENCE_LEVELS.map(e => (
                  <button key={e.value} onClick={() => setForm(f => ({ ...f, experience_level: e.value }))}
                    className={`w-full px-5 py-4 rounded-xl text-left transition-all border ${
                      form.experience_level === e.value
                        ? 'bg-blue-600/20 border-blue-500/50'
                        : 'bg-slate-800/60 border-white/5 hover:border-white/15'
                    }`}>
                    <p className={`font-semibold text-sm ${form.experience_level === e.value ? 'text-blue-300' : 'text-white'}`}>{e.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{e.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Your skills</h2>
              <p className="text-slate-400 text-sm mb-6">Add at least 3 technical skills. These are used for job matching.</p>
              <div className="flex gap-2 mb-4">
                <input
                  value={form.skillInput}
                  onChange={e => setForm(f => ({ ...f, skillInput: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  placeholder="e.g. Python, React, AWS..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all"
                />
                <button onClick={addSkill} className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {form.skills.map(s => (
                    <span key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-300 text-sm">
                      {s}
                      <button onClick={() => removeSkill(s)} className="hover:text-white transition-colors"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-6 space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Location (optional)</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="City, State or Remote" className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">LinkedIn URL (optional)</label>
                    <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                      placeholder="linkedin.com/in/..." className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1.5">GitHub URL (optional)</label>
                    <input value={form.github_url} onChange={e => setForm(f => ({ ...f, github_url: e.target.value }))}
                      placeholder="github.com/..." className="w-full px-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/60 transition-all" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Projects */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Your projects</h2>
              <p className="text-slate-400 text-sm mb-6">Add projects you've built — AI uses these to tailor applications</p>
              <div className="space-y-4 mb-4 max-h-72 overflow-y-auto pr-1">
                {form.projects.map((p, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-800/60 border border-white/5 space-y-3">
                    <div className="flex items-center gap-2">
                      <input value={p.name} onChange={e => updateProject(i, 'name', e.target.value)}
                        placeholder="Project name" className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                      <button onClick={() => removeProject(i)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    <input value={p.description} onChange={e => updateProject(i, 'description', e.target.value)}
                      placeholder="What does it do?" className="w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                    <div className="flex gap-2">
                      <input value={p.techInput || ''} onChange={e => updateProject(i, 'techInput', e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addProjectTech(i))}
                        placeholder="Add tech (Enter)" className="flex-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/8 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500/50 transition-all" />
                    </div>
                    {p.tech_stack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.tech_stack.map(t => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-xs border border-white/5">
                            {t} <button onClick={() => updateProject(i, 'tech_stack', p.tech_stack.filter(x => x !== t))}><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={addProject} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-white/15 text-slate-400 hover:text-white hover:border-white/30 text-sm transition-all">
                <Plus className="w-4 h-4" /> Add Project
              </button>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm hover:bg-white/5 transition-all">
                Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm transition-all">
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? 'Setting up...' : 'Complete Setup 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
