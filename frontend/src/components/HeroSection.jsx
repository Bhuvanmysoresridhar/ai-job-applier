import { ChevronRight, ChevronDown, Mail } from 'lucide-react'

const TechLogos = () => {
  const logos = [
    { name: 'Google', color: '#4285F4', symbol: 'G', x: 65, y: 12 },
    { name: 'Apple', color: '#ffffff', symbol: '', x: 75, y: 28 },
    { name: 'Microsoft', color: '#00A4EF', symbol: '⊞', x: 58, y: 38 },
    { name: 'Meta', color: '#0082FB', symbol: 'f', x: 80, y: 50 },
    { name: 'Amazon', color: '#FF9900', symbol: 'a', x: 68, y: 62 },
    { name: 'Cisco', color: '#1BA0D7', symbol: '≡', x: 55, y: 72 },
    { name: 'Oracle', color: '#F80000', symbol: 'O', x: 78, y: 78 },
  ]

  const connections = [
    { x1: 65, y1: 12, x2: 75, y2: 28 },
    { x1: 75, y1: 28, x2: 58, y2: 38 },
    { x1: 75, y1: 28, x2: 80, y2: 50 },
    { x1: 58, y1: 38, x2: 80, y2: 50 },
    { x1: 80, y1: 50, x2: 68, y2: 62 },
    { x1: 68, y1: 62, x2: 55, y2: 72 },
    { x1: 68, y1: 62, x2: 78, y2: 78 },
    { x1: 55, y1: 72, x2: 78, y2: 78 },
  ]

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {connections.map((conn, i) => (
          <line
            key={i}
            x1={`${conn.x1}%`} y1={`${conn.y1}%`}
            x2={`${conn.x2}%`} y2={`${conn.y2}%`}
            stroke="rgba(59,130,246,0.25)"
            strokeWidth="0.15"
            strokeDasharray="0.5 0.5"
            className="pulse-glow"
          />
        ))}
      </svg>

      {logos.map((logo, i) => (
        <div
          key={logo.name}
          className="absolute flex flex-col items-center logo-glow"
          style={{
            left: `${logo.x}%`,
            top: `${logo.y}%`,
            transform: 'translate(-50%, -50%)',
            animationDelay: `${i * 0.3}s`,
          }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border border-white/10 backdrop-blur-sm pulse-glow"
            style={{
              background: `${logo.color}22`,
              borderColor: `${logo.color}44`,
              color: logo.color,
              boxShadow: `0 0 12px ${logo.color}44, 0 0 24px ${logo.color}22`,
            }}
          >
            {logo.symbol}
          </div>
          <span className="text-[9px] text-white/50 mt-1 font-medium tracking-wide">
            {logo.name}
          </span>
        </div>
      ))}
    </div>
  )
}

const GlowingDataStreams = () => (
  <svg
    className="absolute bottom-0 right-0 w-full h-full pointer-events-none"
    viewBox="0 0 1440 900"
    preserveAspectRatio="xMidYMid slice"
  >
    <defs>
      <linearGradient id="streamOrange" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f97316" stopOpacity="0" />
        <stop offset="50%" stopColor="#fb923c" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.6" />
      </linearGradient>
      <linearGradient id="streamBlue" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
        <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.7" />
        <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.4" />
      </linearGradient>
      <filter id="glow">
        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <path d="M 1440 900 Q 1000 700 700 600 Q 500 530 300 520" stroke="url(#streamOrange)" strokeWidth="2.5" fill="none" filter="url(#glow)" opacity="0.85" />
    <path d="M 1440 870 Q 1050 720 780 640 Q 600 580 400 560" stroke="url(#streamOrange)" strokeWidth="1.5" fill="none" filter="url(#glow)" opacity="0.6" />
    <path d="M 1440 840 Q 1100 750 850 680 Q 680 630 480 590" stroke="url(#streamBlue)" strokeWidth="1.5" fill="none" filter="url(#glow)" opacity="0.5" />
    <path d="M 1440 810 Q 1150 780 920 710 Q 750 670 560 640" stroke="url(#streamOrange)" strokeWidth="1" fill="none" filter="url(#glow)" opacity="0.4" />
  </svg>
)

const RunnerFigure = () => (
  <div className="absolute bottom-0 right-[18%] z-10 h-[70%] flex items-end pointer-events-none">
    <svg
      viewBox="0 0 200 400"
      className="h-full w-auto glow-orange"
      style={{ filter: 'drop-shadow(0 0 20px rgba(251,146,60,0.5)) drop-shadow(0 0 40px rgba(251,146,60,0.2))' }}
    >
      <g fill="none" stroke="#fb923c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="110" cy="40" r="22" fill="#fb923c" stroke="none" />
        <line x1="110" y1="62" x2="108" y2="160" strokeWidth="4" stroke="#f97316" />
        <line x1="108" y1="100" x2="60" y2="80" strokeWidth="3.5" stroke="#fb923c" />
        <line x1="60" y1="80" x2="30" y2="110" strokeWidth="3" stroke="#fb923c" />
        <line x1="108" y1="100" x2="155" y2="115" strokeWidth="3.5" stroke="#fb923c" />
        <line x1="155" y1="115" x2="175" y2="90" strokeWidth="3" stroke="#fb923c" />
        <line x1="108" y1="160" x2="70" y2="240" strokeWidth="4" stroke="#f97316" />
        <line x1="70" y1="240" x2="40" y2="320" strokeWidth="3.5" stroke="#fb923c" />
        <line x1="40" y1="320" x2="15" y2="310" strokeWidth="2.5" stroke="#fb923c" />
        <line x1="108" y1="160" x2="140" y2="250" strokeWidth="4" stroke="#f97316" />
        <line x1="140" y1="250" x2="155" y2="340" strokeWidth="3.5" stroke="#fb923c" />
        <line x1="155" y1="340" x2="180" y2="360" strokeWidth="2.5" stroke="#fb923c" />
      </g>
      <circle cx="110" cy="40" r="22" fill="#0a0f1c" stroke="#fb923c" strokeWidth="3" />
      <circle cx="110" cy="40" r="18" fill="#fb923c" opacity="0.2" />
    </svg>
  </div>
)

export default function HeroSection() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0f1c]">

      {/* ── Background: city skyline ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80&auto=format&fit=crop"
          alt="City nightscape"
          className="w-full h-full object-cover object-center opacity-60"
        />
        {/* Gradient overlay — dark left, transparent right */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1c] via-[#0a0f1ccc] via-50% to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1c] via-transparent to-[#0a0f1c]/40" />
      </div>

      {/* ── Data stream SVG paths ── */}
      <div className="absolute inset-0 z-[2]">
        <GlowingDataStreams />
      </div>

      {/* ── Tech company logos cluster ── */}
      <div className="absolute inset-0 z-[5]">
        <TechLogos />
      </div>

      {/* ── Runner figure ── */}
      <RunnerFigure />

      {/* ════════════════════════ NAVBAR ════════════════════════ */}
      <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-10 py-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 border border-blue-500/40 rounded-md">
            <ChevronRight className="w-5 h-5 text-blue-400" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            BEAM<span className="text-blue-400">.jobs</span>
          </span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8 text-sm tracking-widest uppercase font-medium">
          <a href="#" className="text-slate-300 hover:text-white transition-colors">About</a>
          <a href="#" className="text-white border-b-2 border-orange-400 pb-0.5">Roadmap</a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors">Bios</a>
          <a href="#" className="text-slate-300 hover:text-white transition-colors">FAQ</a>
        </div>

        {/* CTA button */}
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-blue-950/60 border border-blue-700/40 text-white text-sm font-medium tracking-wide hover:bg-blue-900/60 hover:border-blue-500/60 transition-all backdrop-blur-sm">
          <Mail className="w-4 h-4" />
          Contact Us
        </button>
      </nav>

      {/* ════════════════════════ HERO CONTENT ════════════════════════ */}
      <div className="relative z-20 min-h-screen flex items-center">
        <div className="w-full max-w-3xl pl-16 md:pl-24 pt-24 pb-16">

          {/* Accent line */}
          <div className="animate-fade-up w-24 h-1 bg-white mb-8 rounded-full" />

          {/* Tag */}
          <div className="animate-fade-up-delay-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-widest uppercase mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            AI-Powered Job Applications
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up-delay-1 text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-none mb-6">
            ACHIEVE<br />
            <span className="text-glow bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent">
              YOUR GOAL
            </span>
          </h1>

          {/* Subtext */}
          <p className="animate-fade-up-delay-2 text-slate-300 text-lg leading-relaxed max-w-lg mb-10">
            Stop spending hours filling job applications every day. Our AI agents work on your behalf — scraping the right opportunities, tailoring your resume, filling application forms, and monitoring your inbox for interview invites and rejections.
          </p>

          {/* CTAs */}
          <div className="animate-fade-up-delay-3 flex flex-wrap items-center gap-4 mb-16">
            <button className="px-8 py-3.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-semibold text-sm tracking-wide transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-400/40 hover:scale-105">
              Get Started Free
            </button>
            <button className="flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/20 text-white font-medium text-sm tracking-wide hover:border-white/50 hover:bg-white/5 transition-all">
              Watch Demo
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Stats row */}
          <div className="animate-fade-up-delay-3 flex flex-wrap gap-10">
            {[
              { value: '10,000+', label: 'Jobs Applied Daily' },
              { value: '94%', label: 'Interview Rate' },
              { value: '2 hrs', label: 'Saved Per Day' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-slate-400 text-sm mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-16 z-50 flex flex-col items-center gap-2">
        <span className="text-slate-500 text-xs tracking-[0.3em] uppercase font-medium">Scroll</span>
        <ChevronDown className="w-4 h-4 text-slate-500 animate-bounce" />
      </div>

    </div>
  )
}
