import { useQuery } from '@tanstack/react-query';
import { GitMerge, Clock, CheckCircle2, Cpu } from 'lucide-react';
import { getFederatedStatus, getFederatedRounds } from '../services/api';
import { SkeletonCard, SectionHeader } from '../components/UI';

export default function FederatedTrainingView() {
  const { data: status, isLoading: l1 } = useQuery({ queryKey: ['fed-status'], queryFn: getFederatedStatus });
  const { data: rounds, isLoading: l2 } = useQuery({ queryKey: ['fed-rounds'], queryFn: getFederatedRounds });

  if (l1 || l2) return <SkeletonCard className="h-80" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Federated Learning Monitor"
        subtitle="Real-time aggregation status across Bank A, Bank B, and FinTech C"
      />

      {/* Global Model Status */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <GitMerge size={18} className="text-indigo-400" />
          <h2 className="font-semibold text-white text-base">Global Federated Model State</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4">
            <span className="text-xs text-slate-500 block mb-1">Status</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              <CheckCircle2 size={12} /> {status?.status ?? 'READY'}
            </span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4">
            <span className="text-xs text-slate-500 block mb-1">Latest Round</span>
            <span className="font-mono font-bold text-white text-lg">{status?.latest_round ?? 0}</span>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4">
            <span className="text-xs text-slate-500 block mb-1">Global Model Hash</span>
            <span className="font-mono text-indigo-300 text-sm font-semibold">{status?.global_model_version ?? 'N/A'}</span>
          </div>
        </div>

        {status?.global_metrics && Object.keys(status.global_metrics).length > 0 && (
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Cpu size={14} className="text-indigo-400" /> Aggregated Performance Metrics
            </p>
            <div className="grid md:grid-cols-4 gap-4">
              {Object.entries(status.global_metrics).map(([k, v]) => (
                <div key={k} className="p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-xs text-slate-500 block capitalize">{k.replace(/_/g, ' ')}</span>
                  <span className="font-mono font-bold text-slate-200 text-sm">
                    {typeof v === 'number' ? v.toFixed(4) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 pt-2">
          Federated rounds coordinate gradient updates between client nodes using FedAvg. Privacy is strictly maintained as raw datasets remain isolated at host institutions.
        </p>
      </div>

      {/* Round History */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <Clock size={18} className="text-indigo-400" />
          <h2 className="font-semibold text-white text-base">Federated Round Logs</h2>
        </div>

        {!rounds || rounds.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No federated training rounds recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Model Version</th>
                  <th className="px-4 py-3">Participating Nodes</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {rounds.map(r => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-200">#{r.round_number}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-300 text-xs">{r.global_model_version}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{r.participating_clients}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
