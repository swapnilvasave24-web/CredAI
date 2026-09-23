import React, { useEffect, useRef } from 'react';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// ── Spinner ────────────────────────────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-indigo-400 ${className}`} />;
}

// ── Loading overlay ────────────────────────────────────────────────────────────
export function LoadingOverlay({ message = 'Loading…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
        <Spinner size={24} />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
export function SkeletonBlock({ h = 'h-4', w = 'w-full', className = '' }: {
  h?: string; w?: string; className?: string;
}) {
  return <div className={`skeleton ${h} ${w} ${className}`} />;
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card p-6 space-y-4 ${className}`}>
      <SkeletonBlock h="h-5" w="w-1/3" />
      <SkeletonBlock h="h-4" w="w-2/3" />
      <SkeletonBlock h="h-4" w="w-full" />
      <SkeletonBlock h="h-4" w="w-3/4" />
    </div>
  );
}

// ── Error message ──────────────────────────────────────────────────────────────
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400">
      {message}
    </div>
  );
}

// ── Risk badge ─────────────────────────────────────────────────────────────────
export function RiskBadge({ risk }: { risk: string }) {
  const cls =
    risk === 'LOW_RISK'    ? 'badge-low' :
    risk === 'MEDIUM_RISK' ? 'badge-medium' : 'badge-high';
  const label =
    risk === 'LOW_RISK'    ? 'Low Risk' :
    risk === 'MEDIUM_RISK' ? 'Medium Risk' : 'High Risk';
  return <span className={cls}>{label}</span>;
}

// ── Recommendation badge ───────────────────────────────────────────────────────
export function RecoBadge({ rec }: { rec: string }) {
  if (rec === 'ELIGIBLE')        return <span className="badge-low">Eligible</span>;
  if (rec === 'REVIEW_REQUIRED') return <span className="badge-medium">Review Required</span>;
  return <span className="badge-high">Not Eligible</span>;
}

// ── Animated Score Ring ────────────────────────────────────────────────────────
export function ScoreRing({ score, risk, size = 160 }: { score: number; risk: string; size?: number }) {
  const color =
    risk === 'LOW_RISK'    ? '#34d399' :   // emerald-400
    risk === 'MEDIUM_RISK' ? '#fbbf24' :   // amber-400
                             '#f87171';    // rose-400

  const trackColor  = 'rgba(255,255,255,0.06)';
  const R           = 52;
  const circumference = 2 * Math.PI * R;
  const pct         = ((score - 300) / 600);
  const offset      = circumference - pct * circumference;

  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    el.style.setProperty('--ring-empty',  String(circumference));
    el.style.setProperty('--ring-offset', String(offset));
    el.classList.remove('ring-animated');
    void el.getBoundingClientRect(); // reflow
    el.classList.add('ring-animated');
  }, [score, offset, circumference]);

  const glowClass =
    risk === 'LOW_RISK'    ? 'glow-low' :
    risk === 'MEDIUM_RISK' ? 'glow-medium' : 'glow-high';

  return (
    <div
      className={`relative flex items-center justify-center rounded-full ${glowClass}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg className="absolute inset-0 -rotate-90 w-full h-full" viewBox="0 0 120 120" fill="none">
        <circle cx="60" cy="60" r={R} stroke={trackColor} strokeWidth="10" />
        <circle
          ref={circleRef}
          cx="60" cy="60" r={R}
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-3xl font-extrabold" style={{ color }}>{score}</div>
        <div className="text-[11px] text-slate-400 font-medium mt-0.5 tracking-wide uppercase">
          CredAI Score
        </div>
      </div>
    </div>
  );
}

// ── SHAP Waterfall Chart ───────────────────────────────────────────────────────
export function ShapChart({ contributors }: { contributors: Array<{
  friendly_label: string; shap_value: number; contribution_type: string; is_synthetic: boolean;
}> }) {
  const max = Math.max(...contributors.map(c => Math.abs(c.shap_value)), 0.001);

  return (
    <div className="space-y-3">
      {contributors.map((c, i) => {
        const isPos = c.contribution_type === 'decreases_risk';
        const pct   = (Math.abs(c.shap_value) / max) * 100;
        const barColor = isPos ? '#34d399' : '#f87171';
        const Icon = isPos ? TrendingDown : TrendingUp;
        return (
          <div key={i} className="group">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={13} style={{ color: barColor }} className="shrink-0" />
                <span className="text-sm text-slate-200 font-medium truncate">
                  {c.friendly_label}
                </span>
                {c.is_synthetic && (
                  <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full
                                   bg-amber-500/10 text-amber-500 border border-amber-500/20">
                    alt data
                  </span>
                )}
              </div>
              <span className="text-xs font-bold ml-3 shrink-0"
                style={{ color: barColor }}>
                {isPos ? '▼ lowers risk' : '▲ raises risk'}
              </span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: barColor,
                         boxShadow: `0 0 8px 0 ${barColor}60` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-slate-500 pt-2">
        Bars show relative SHAP contribution magnitude — green lowers default risk, red raises it.
      </p>
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = 'indigo', color }: {
  label: string; value: string | number; sub?: string; accent?: string; color?: string;
}) {
  const chosen = color || accent;
  const accents: Record<string, string> = {
    indigo: 'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
    blue:   'from-indigo-500/10 to-indigo-500/5 border-indigo-500/20 text-indigo-400',
    emerald:'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    green:  'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    amber:  'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    yellow: 'from-amber-500/10 to-amber-500/5 border-amber-500/20 text-amber-400',
    purple: 'from-violet-500/10 to-violet-500/5 border-violet-500/20 text-violet-400',
    rose:   'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400',
    red:    'from-rose-500/10 to-rose-500/5 border-rose-500/20 text-rose-400',
  };
  const theme = accents[chosen] ?? accents.indigo;

  return (
    <div className={`card p-5 border bg-gradient-to-br ${theme} flex flex-col justify-between overflow-hidden min-w-0`}>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-2xl lg:text-3xl font-extrabold tracking-tight truncate max-w-full">
          {value}
        </span>
      </div>
      {sub && <p className="text-xs text-slate-500 mt-1 truncate">{sub}</p>}
    </div>
  );
}

// ── Metric row ─────────────────────────────────────────────────────────────────
export function MetricRow({ label, value }: { label: string; value: string | number | React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/[0.04] last:border-0 min-w-0 gap-3">
      <span className="text-sm text-slate-400 truncate">{label}</span>
      <span className="text-sm font-semibold text-slate-200 shrink-0">{value}</span>
    </div>
  );
}
