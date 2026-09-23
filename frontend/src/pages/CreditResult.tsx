import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAssessment } from '../services/api';
import type { AssessmentResult, ShapContributor } from '../types';
import { ScoreRing, RiskBadge, RecoBadge, ShapChart, SkeletonCard, SectionHeader } from '../components/UI';
import { AlertTriangle, ShieldCheck, Cpu, Sparkles, TrendingUp, Info } from 'lucide-react';

function RecommendationBox({ rec }: { rec: string }) {
  const cfg = {
    ELIGIBLE: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
      title: 'Eligible for Consideration',
      body: "Based on CredAI's model evaluation, your risk metrics fall within standard credit tolerance limits."
    },
    REVIEW_REQUIRED: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
      title: 'Manual Review Recommended',
      body: 'Your profile has mixed credit signals (e.g. debt ratio or term length). Requires secondary underwriting.'
    },
    NOT_ELIGIBLE: {
      bg: 'bg-rose-500/10 border-rose-500/20 text-rose-300',
      title: 'Elevated Risk Profile',
      body: 'Model outputs indicate higher default risk under current financial parameters. Consider lowering credit amount or extending term.'
    },
  }[rec] ?? {
    bg: 'bg-slate-800 border-slate-700 text-slate-300',
    title: rec,
    body: ''
  };

  return (
    <div className={`rounded-2xl border ${cfg.bg} p-6 space-y-2`}>
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} className="shrink-0" />
        <h3 className="font-bold text-lg">{cfg.title}</h3>
      </div>
      <p className="text-sm leading-relaxed opacity-90">{cfg.body}</p>
    </div>
  );
}

/** Detects if alternative-data (syn_) features are among the top positive contributors (reducing risk) */
function AltDataCallout({ contributors }: { contributors: ShapContributor[] }) {
  const synPositive = contributors.filter(
    c => c.feature.startsWith('syn_') && (c.contribution_type === 'decreases_risk' || c.shap_value < 0)
  );
  if (synPositive.length === 0) return null;

  const labels = synPositive.map(c => c.friendly_label || c.feature).slice(0, 3);

  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-indigo-500/8 p-5 flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles size={16} className="text-indigo-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-indigo-300 mb-1">
          🎯 Alternative Data Powered This Score
        </p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Your creditworthiness was assessed using <strong className="text-indigo-300">alternative financial signals</strong> —
          not just traditional bureau history. The following signals worked in your favour:{' '}
          <span className="text-indigo-200 font-medium">{labels.join(', ')}</span>.
          This is how CredAI helps borrowers with thin or no credit history.
        </p>
      </div>
    </div>
  );
}

/** Generates actionable guidance from the top negative SHAP contributors (increasing risk) */
function ImprovementGuidance({ contributors, rec }: { contributors: ShapContributor[]; rec: string }) {
  if (rec === 'ELIGIBLE') return null;

  const negContribs = contributors.filter(
    c => c.contribution_type === 'increases_risk' || c.shap_value > 0
  ).slice(0, 3);
  if (negContribs.length === 0) return null;

  const tips: Record<string, string> = {
    BUREAU_OVERDUE_RATIO:              'Bringing your bureau overdue ratio to 0% could meaningfully reduce your default probability.',
    INSTALLMENT_LATE_RATIO:            'Reducing late installment payments improves your repayment reliability signal.',
    INSTALLMENT_AVG_DAYS_LATE:         'Paying installments on time consistently is the fastest way to improve your score.',
    DEBT_TO_INCOME:                    'Lowering your requested credit amount (or increasing income) improves your debt-to-income ratio.',
    ANNUITY_TO_INCOME:                 'Extending the loan term lowers monthly EMI and reduces your annuity-to-income stress.',
    syn_utility_payment_reliability:   'Maintaining a streak of on-time utility bill payments strengthens your alternative credit signal.',
    syn_monthly_savings_rate:          'Increasing your monthly savings rate — even from 5% to 12% — can lift your stability score.',
    syn_txn_consistency:               'More consistent UPI transaction activity signals reliable cash flow to the model.',
    IS_THIN_FILE:                      'Consistent UPI transaction volume and utility payment reliability establish creditworthiness without bureau history.',
  };

  const hints = negContribs
    .map(c => tips[c.feature])
    .filter(Boolean);

  if (hints.length === 0) return null;

  return (
    <div className="card p-6 space-y-4">
      <h3 className="font-semibold text-white text-base flex items-center gap-2">
        <TrendingUp size={18} className="text-amber-400" /> How to Improve Your Score
      </h3>
      <ul className="space-y-2.5">
        {hints.map((hint, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-400">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/25
                             flex items-center justify-center shrink-0 text-amber-400 text-[11px] font-bold">
              {i + 1}
            </span>
            {hint}
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-600 flex items-center gap-1.5">
        <Info size={11} /> These are directional suggestions only, not a guarantee of score change.
      </p>
    </div>
  );
}

export default function CreditResult() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const preloaded = location.state as AssessmentResult | null;

  const { data: result, isLoading } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => getAssessment(Number(id)),
    initialData: preloaded ?? undefined,
    enabled: !preloaded,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-20" />
        <div className="grid md:grid-cols-3 gap-6">
          <SkeletonCard className="h-72" />
          <SkeletonCard className="h-72 md:col-span-2" />
        </div>
      </div>
    );
  }

  if (!result) return <p className="text-slate-400">Assessment not found.</p>;

  const contributors = result.top_contributors ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Assessment Results & SHAP Explanation"
        subtitle={`Model version ${result.model_version} · Evaluated ${new Date(result.created_at).toLocaleString()}`}
      />

      <div className="grid md:grid-cols-3 gap-6">
        {/* Score Ring Card */}
        <div className="card p-6 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
            CredAI Score
          </p>
          <ScoreRing score={result.credit_score} risk={result.risk_level} size={150} />

          <div className="mt-6 w-full space-y-3 border-t border-white/[0.06] pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Risk Band</span>
              <RiskBadge risk={result.risk_level} />
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Model Default Prob.</span>
              <span className="font-semibold text-slate-200">
                {(result.default_probability * 100).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation + Summary Table */}
        <div className="md:col-span-2 space-y-5">
          <RecommendationBox rec={result.recommendation} />

          <div className="card p-6">
            <h3 className="font-semibold text-white text-base mb-4 flex items-center gap-2">
              <Cpu size={18} className="text-indigo-400" /> Evaluation Summary
            </h3>
            <div className="space-y-2.5 divide-y divide-white/[0.04]">
              <div className="flex justify-between items-center text-sm pt-1">
                <span className="text-slate-400">Calculated Score</span>
                <span className="font-mono font-bold text-white text-base">{result.credit_score} / 900</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2.5">
                <span className="text-slate-400">Probability of Default</span>
                <span className="font-mono font-semibold text-slate-200">{(result.default_probability * 100).toFixed(3)}%</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2.5">
                <span className="text-slate-400">Recommendation Status</span>
                <RecoBadge rec={result.recommendation} />
              </div>
              <div className="flex justify-between items-center text-sm pt-2.5">
                <span className="text-slate-400">Scoring Engine</span>
                <span className="font-mono text-slate-400 text-xs">{result.model_version}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alternative Data Callout — only shown when syn_ features helped */}
      {contributors.length > 0 && <AltDataCallout contributors={contributors} />}

      {/* SHAP Explanation */}
      <div className="card p-6">
        <div className="mb-6">
          <h2 className="font-semibold text-white text-lg">SHAP Feature Influence Analysis</h2>
          <p className="text-xs text-slate-400 mt-1">
            SHapley Additive exPlanations quantify how each financial factor shifted your score
            relative to baseline applicant averages. <span className="text-indigo-400">Purple bars</span> indicate
            alternative data signals (UPI, savings, utility) — the key innovation for thin-file borrowers.
          </p>
        </div>
        {contributors.length > 0 ? (
          <ShapChart contributors={contributors} />
        ) : (
          <p className="text-sm text-slate-500">No feature attribution data recorded for this run.</p>
        )}
      </div>

      {/* Score Improvement Guidance */}
      <ImprovementGuidance contributors={contributors} rec={result.recommendation} />

      {/* Disclaimer */}
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/50 p-4 text-xs text-slate-500 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="text-slate-400">Prototype Disclaimer:</strong> The CredAI score is generated
          by an experimental federated XGBoost model. It is intended strictly for technology evaluation and
          does not constitute official credit bureau decisioning (CIBIL/FICO/Experian).
        </span>
      </div>
    </div>
  );
}
