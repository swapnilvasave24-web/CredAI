import { Link } from 'react-router-dom';
import { ShieldCheck, Brain, Lock, BarChart3, ChevronRight, Zap, Users, ArrowRight, XCircle, CheckCircle2 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-950 text-gray-100">

      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.06]"
        style={{ background: 'rgba(9,11,22,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/60">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">CredAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-40 pb-28 overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }} />
        <div className="absolute top-32 left-1/4 w-72 h-72 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-48 right-1/4 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                          bg-indigo-500/10 border border-indigo-500/20
                          text-indigo-400 text-xs font-semibold mb-8">
            <Lock size={11} />
            Privacy-Preserving · Federated Learning · Explainable AI
          </div>

          <h1 className="text-6xl font-extrabold leading-[1.08] mb-6 tracking-tight">
            No Credit History?{' '}
            <span className="text-gradient">You Still Deserve a Score.</span>
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4 leading-relaxed">
            Millions of first-time borrowers, gig workers, and MSMEs are locked out of credit —
            not because they're risky, but because they're <strong className="text-slate-300">invisible to traditional bureaus</strong>.
          </p>
          <p className="text-base text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            CredAI breaks the thin-file trap using UPI transactions, utility payments, and
            savings behaviour — scored privately through federated machine learning.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-8 py-3.5">
              Check Your Credit Score <ChevronRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary text-base px-8 py-3.5">
              Sign In
            </Link>
          </div>

          {/* Stats bar */}
          <div className="mt-16 grid grid-cols-4 gap-px rounded-2xl overflow-hidden border border-white/[0.06]"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            {[
              { label: 'Model ROC-AUC',   value: '0.86+' },
              { label: 'Thin-File Ready', value: '✓' },
              { label: 'Privacy Method',  value: 'FedAvg' },
              { label: 'Explainability',  value: 'SHAP' },
            ].map(({ label, value }) => (
              <div key={label} className="py-5 px-4 text-center bg-slate-900/60">
                <div className="text-2xl font-extrabold text-indigo-400">{value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Thin-File Trap ────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white mb-3">The Thin-File Trap</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Traditional credit scoring creates a vicious cycle that excludes the people who need credit most.
            </p>
          </div>

          {/* Trap Cycle Diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-3 mb-10">
            {[
              { label: 'No Credit History', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: '', icon: ArrowRight, color: 'text-slate-600', bg: '' },
              { label: 'Loan Rejected', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
              { label: '', icon: ArrowRight, color: 'text-slate-600', bg: '' },
              { label: 'No Credit History', icon: XCircle, color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20' },
            ].map(({ label, icon: Icon, color, bg }, i) => (
              label ? (
                <div key={i} className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl border ${bg} shrink-0`}>
                  <Icon size={16} className={color} />
                  <span className="text-sm font-semibold text-slate-300">{label}</span>
                </div>
              ) : (
                <Icon key={i} size={20} className={color} />
              )
            ))}
          </div>

          {/* CredAI Solution */}
          <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/5 p-6 text-center">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">CredAI breaks this cycle</p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-3">
              {[
                { label: 'UPI Transactions', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: '', icon: ArrowRight, color: 'text-slate-500', bg: '' },
                { label: 'CredAI Score', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: '', icon: ArrowRight, color: 'text-slate-500', bg: '' },
                { label: 'Loan Approved', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                { label: '', icon: ArrowRight, color: 'text-slate-500', bg: '' },
                { label: 'Credit History Begins', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
              ].map(({ label, icon: Icon, color, bg }, i) => (
                label ? (
                  <div key={i} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${bg} shrink-0`}>
                    <Icon size={14} className={color} />
                    <span className="text-xs font-semibold text-slate-300">{label}</span>
                  </div>
                ) : (
                  <Icon key={i} size={16} className={color} />
                )
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How CredAI is Different</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Three pillars designed specifically for borrowers the traditional system ignores
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                icon: BarChart3, gradient: 'from-indigo-600/20 to-blue-600/10',
                border: 'border-indigo-500/20', iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-400',
                title: 'Alternative Data',
                desc: 'Goes beyond traditional credit history — uses payment behaviour, income stability, and transaction patterns for underserved populations.',
              },
              {
                icon: Lock, gradient: 'from-violet-600/20 to-purple-600/10',
                border: 'border-violet-500/20', iconBg: 'bg-violet-500/20', iconColor: 'text-violet-400',
                title: 'Federated Learning',
                desc: 'Financial institutions collaborate without sharing raw data. Only model parameters are exchanged — never customer records.',
              },
              {
                icon: Brain, gradient: 'from-emerald-600/20 to-teal-600/10',
                border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-400',
                title: 'Explainable AI',
                desc: 'Every credit score includes SHAP-powered plain-English explanations showing exactly which factors helped or hurt your assessment.',
              },
            ].map(({ icon: Icon, gradient, border, iconBg, iconColor, title, desc }) => (
              <div key={title}
                className={`card-glass p-6 border ${border} bg-gradient-to-b ${gradient}
                             hover:-translate-y-1 transition-transform duration-300 cursor-default`}>
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon size={18} className={iconColor} />
                </div>
                <h3 className="font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-12">How CredAI Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: Users,    title: 'Create Profile',      desc: 'Sign up and complete your personal profile' },
              { step: '2', icon: BarChart3, title: 'Submit Assessment',   desc: 'Enter your financial and alternative data' },
              { step: '3', icon: Zap,       title: 'AI Evaluation',       desc: 'Federated model computes your credit risk' },
              { step: '4', icon: Brain,     title: 'Get Your Score',      desc: 'Receive score with SHAP-powered explanation' },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30
                                flex items-center justify-center mx-auto mb-4 relative">
                  <Icon size={20} className="text-indigo-400" />
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-600
                                   text-white text-[10px] font-bold flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm mb-1">{title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="py-20 border-t border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="card-glass border border-indigo-500/20 p-10 rounded-3xl
                          bg-gradient-to-b from-indigo-600/10 to-transparent">
            <h2 className="text-3xl font-bold text-white mb-3">Don't have a credit score yet?</h2>
            <p className="text-slate-400 mb-2">That's exactly who CredAI is built for.</p>
            <p className="text-slate-500 text-sm mb-8">Create a free account and get scored on your UPI activity, utility payments, and savings — in minutes.</p>
            <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-10 py-3.5">
              Get Your First Credit Score <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-indigo-500" />
            <span className="text-sm font-medium text-slate-400">CredAI</span>
          </div>
          <p className="text-xs text-slate-600 text-center">
            Privacy-Preserving Federated Credit Scoring · Not an official credit bureau score · Not financial advice
          </p>
        </div>
      </footer>
    </div>
  );
}
