import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList, ChevronRight, Calendar, ArrowUpRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAssessments } from '../services/api';
import { ScoreRing, RiskBadge, RecoBadge, SkeletonCard, SectionHeader } from '../components/UI';

export default function ApplicantDashboard() {
  const { user } = useAuth();
  const { data: history, isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: getAssessments,
  });

  const latest = history?.[0];

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Applicant'}`}
        subtitle="Your privacy-preserving AI credit overview and history"
        action={
          <Link to="/assessment" className="btn-primary flex items-center gap-2 text-sm">
            <Sparkles size={16} /> New Assessment
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-6">
          <SkeletonCard className="h-80 md:col-span-1" />
          <SkeletonCard className="h-80 md:col-span-2" />
        </div>
      ) : latest ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Score card */}
          <div className="card p-6 md:col-span-1 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
              CredAI Credit Score
            </p>
            <ScoreRing score={latest.credit_score} risk={latest.risk_level} size={150} />
            <div className="mt-6 space-y-3 w-full border-t border-white/[0.06] pt-5">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Risk Assessment</span>
                <RiskBadge risk={latest.risk_level} />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Default Risk</span>
                <span className="font-semibold text-slate-200">
                  {(latest.default_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Recommendation</span>
                <RecoBadge rec={latest.recommendation} />
              </div>
            </div>
            <div className="mt-6 flex gap-3 w-full">
              <Link to={`/result/${latest.id}`} className="btn-secondary flex-1 text-center text-sm py-2 flex items-center justify-center gap-1">
                Details <ArrowUpRight size={14} />
              </Link>
              <Link to="/assessment" className="btn-primary flex-1 text-center text-sm py-2">
                Re-assess
              </Link>
            </div>
          </div>

          {/* Recent history */}
          <div className="card p-6 md:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-semibold text-white text-lg">Assessment History</h2>
                  <p className="text-xs text-slate-400">Your recent credit evaluations</p>
                </div>
                <Link to="/history" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                  View all <ChevronRight size={14} />
                </Link>
              </div>

              <div className="space-y-2.5">
                {history?.slice(0, 4).map(a => (
                  <Link key={a.id} to={`/result/${a.id}`}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
                        <span className="font-bold text-sm text-indigo-300">{a.credit_score}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Score: {a.credit_score} / 850</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={12} /> {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <RiskBadge risk={a.risk_level} />
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
              <span>Total assessments: <strong className="text-slate-300">{history?.length ?? 0}</strong></span>
              <span>Model build: <span className="text-slate-400 font-mono">XGBoost v2.0+SHAP</span></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <ClipboardList size={28} />
          </div>
          <h2 className="font-semibold text-white text-lg mb-2">No assessments yet</h2>
          <p className="text-sm text-slate-400 mb-6">Submit your financial parameters to receive your privacy-preserving CredAI score.</p>
          <Link to="/assessment" className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={16} /> Start First Assessment
          </Link>
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/50 p-4 text-xs text-slate-500 leading-relaxed">
        <strong className="text-slate-400">Disclaimer:</strong> The CredAI Credit Score is a privacy-preserving synthetic assessment metric for demonstration purposes. Recommendations are computed via automated machine learning models and do not constitute a binding financial agreement.
      </div>
    </div>
  );
}
