import { useQuery } from '@tanstack/react-query';
import { Building2, Database, GitBranch, ShieldCheck } from 'lucide-react';
import { getInstitutionStatus, getInstitutionMetrics } from '../services/api';
import { StatCard, SkeletonCard, SectionHeader } from '../components/UI';

export default function InstitutionDashboard() {
  const { data: status, isLoading: l1 } = useQuery({ queryKey: ['inst-status'], queryFn: getInstitutionStatus });
  const { data: metrics, isLoading: l2 } = useQuery({ queryKey: ['inst-metrics'], queryFn: getInstitutionMetrics });

  if (l1 || l2) return <SkeletonCard className="h-80" />;

  return (
    <div className="space-y-6">
      <SectionHeader
        title={status?.institution_name ?? 'Institution Portal'}
        subtitle={`Federated Learning Node · Client ID: ${status?.client_id ?? 'node-01'}`}
      />

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard label="Federated Round" value={status?.latest_federated_round ?? 0} color="blue" />
        <StatCard label="Global Model Version" value={status?.global_model_version ?? 'N/A'} color="green" />
        <StatCard label="Local Training Partition" value={status?.local_dataset_stats.n_train ?? 0} color="purple" />
        <StatCard label="Local Default Rate" value={`${((status?.local_dataset_stats.target_rate_train ?? 0) * 100).toFixed(1)}%`} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Local Dataset Stats */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Database size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-white text-base">Node Partition Statistics</h2>
          </div>
          <div className="space-y-2.5 divide-y divide-white/[0.04]">
            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-slate-400">Training Samples</span>
              <span className="font-mono font-semibold text-slate-200">{status?.local_dataset_stats.n_train ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2.5">
              <span className="text-slate-400">Validation Samples</span>
              <span className="font-mono font-semibold text-slate-200">{status?.local_dataset_stats.n_val ?? 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2.5">
              <span className="text-slate-400">Target Default Rate (Train)</span>
              <span className="font-mono font-semibold text-slate-200">{((status?.local_dataset_stats.target_rate_train ?? 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2.5">
              <span className="text-slate-400">Target Default Rate (Val)</span>
              <span className="font-mono font-semibold text-slate-200">{((status?.local_dataset_stats.target_rate_val ?? 0) * 100).toFixed(2)}%</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 pt-2 border-t border-white/[0.06]">
            Privacy Enforcement: Raw applicant rows remain strictly on node storage at {status?.institution_name}. Only differential parameters are shared during FedAvg rounds.
          </p>
        </div>

        {/* Model Metrics */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <GitBranch size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-white text-base">Local & Global Metrics</h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Local Node Model</p>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-slate-900/40 space-y-2">
                <div className="flex justify-between text-xs text-slate-400"><span>Local Loss</span><span className="font-mono text-slate-200">{metrics?.local_metrics?.local_loss?.toFixed(4) ?? '—'}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Local Accuracy</span><span className="font-mono text-slate-200">{metrics?.local_metrics?.local_accuracy ? `${(metrics.local_metrics.local_accuracy * 100).toFixed(2)}%` : '—'}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Sample Size</span><span className="font-mono text-slate-200">{metrics?.local_metrics?.n_samples ?? '—'}</span></div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Global Aggregated Model</p>
              <div className="p-3 rounded-xl border border-white/[0.06] bg-slate-900/40 space-y-2">
                <div className="flex justify-between text-xs text-slate-400"><span>ROC-AUC</span><span className="font-mono text-indigo-300 font-bold">{metrics?.global_metrics?.roc_auc?.toFixed(4) ?? '—'}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>Global Accuracy</span><span className="font-mono text-slate-200">{metrics?.global_metrics?.accuracy ? `${(metrics.global_metrics.accuracy * 100).toFixed(2)}%` : '—'}</span></div>
                <div className="flex justify-between text-xs text-slate-400"><span>F1 Score</span><span className="font-mono text-slate-200">{metrics?.global_metrics?.f1?.toFixed(4) ?? '—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
        <ShieldCheck size={14} className="text-indigo-400" />
        Verified Node Node ID: <span className="font-mono text-slate-400">{status?.client_id ?? 'bank_a'}</span>
      </div>
    </div>
  );
}
