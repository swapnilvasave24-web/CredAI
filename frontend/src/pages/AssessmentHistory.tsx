import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { History, ChevronRight, Calendar } from 'lucide-react';
import { getAssessments } from '../services/api';
import { RiskBadge, RecoBadge, SkeletonCard, SectionHeader } from '../components/UI';

export default function AssessmentHistory() {
  const { data: history, isLoading } = useQuery({ queryKey: ['assessments'], queryFn: getAssessments });

  return (
    <div className="space-y-6">
      <SectionHeader title="Assessment History" subtitle="Comprehensive audit trail of your evaluated credit score assessments." />

      {isLoading ? (
        <SkeletonCard className="h-64" />
      ) : !history || history.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <History size={24} />
          </div>
          <h2 className="font-semibold text-white text-lg mb-2">No historical records</h2>
          <p className="text-sm text-slate-400 mb-6">You haven't submitted any credit assessments yet.</p>
          <Link to="/assessment" className="btn-primary">Start New Assessment</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">CredAI Score</th>
                  <th className="px-5 py-3.5">Risk Rating</th>
                  <th className="px-5 py-3.5">Default Prob.</th>
                  <th className="px-5 py-3.5">Recommendation</th>
                  <th className="px-5 py-3.5">Pipeline Version</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {history.map(a => (
                  <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-5 py-4 text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar size={13} className="text-slate-500" />
                      {new Date(a.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td className="px-5 py-4 font-bold font-mono text-indigo-300 text-base">{a.credit_score}</td>
                    <td className="px-5 py-4"><RiskBadge risk={a.risk_level} /></td>
                    <td className="px-5 py-4 font-mono text-slate-300">{(a.default_probability * 100).toFixed(1)}%</td>
                    <td className="px-5 py-4"><RecoBadge rec={a.recommendation} /></td>
                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{a.model_version}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link to={`/result/${a.id}`} className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold inline-flex items-center gap-1 transition-colors">
                        Details <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
