import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Users, Building2, Cpu, ShieldAlert, CheckCircle2, History,
  Activity, Database, Lock, ShieldCheck, ArrowRight, RefreshCw, Sparkles, Info
} from 'lucide-react';
import { getAdminDashboard, getFairness, startFederatedTraining, getFederatedRounds } from '../services/api';
import { StatCard, SkeletonCard, SectionHeader, Spinner, ErrorMessage } from '../components/UI';
import type { FairnessCohortData } from '../types';

/** Interactive Federated Averaging visual architecture component */
function FedAvgArchitectureDiagram() {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-indigo-950/20 via-slate-900/60 to-slate-900/40 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
              Privacy-Preserving Architecture
            </span>
            <span className="text-xs text-slate-500">Decentralized Intelligence</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1">
            How Multi-Party FedAvg Protects Customer Data
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
          <ShieldCheck size={14} className="shrink-0" />
          <span>Raw Data Never Leaves Boundary</span>
        </div>
      </div>

      {/* Nodes and Flow Diagram */}
      <div className="grid lg:grid-cols-12 gap-4 items-center">
        {/* Left: 3 Local Institution Nodes */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-1">
            <Building2 size={13} className="text-indigo-400" /> Participating Institution Nodes (Silos)
          </div>

          {/* Bank A */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/70 relative group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/25 flex items-center justify-center text-blue-400 font-bold text-xs">
                  A
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Bank A (Retail Silo)</h4>
                  <p className="text-[11px] text-slate-400">Salaried accounts, loans & salary credits</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                θ_A weights
              </span>
            </div>
          </div>

          {/* Bank B */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/70 relative group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold text-xs">
                  B
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Bank B (Commercial Silo)</h4>
                  <p className="text-[11px] text-slate-400">MSME working capital & merchant flows</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                θ_B weights
              </span>
            </div>
          </div>

          {/* FinTech C */}
          <div className="p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/70 relative group hover:border-indigo-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 font-bold text-xs">
                  C
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">FinTech C (Digital Wallet)</h4>
                  <p className="text-[11px] text-slate-400">UPI streams, utility bills & thin-file profiles</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                θ_C weights
              </span>
            </div>
          </div>
        </div>

        {/* Center: Privacy Boundary / Transmission */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center py-4 px-2 text-center space-y-3">
          <div className="w-full flex items-center justify-center gap-2 text-indigo-400">
            <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-indigo-500 flex-1" />
            <div className="px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 shrink-0 shadow-lg shadow-indigo-500/10">
              <Lock size={12} className="text-indigo-400" />
              <span>Encrypted Updates Only</span>
            </div>
            <div className="h-px bg-gradient-to-r from-indigo-500 via-indigo-500/50 to-transparent flex-1" />
          </div>

          <p className="text-[11px] text-slate-400 max-w-[210px] leading-relaxed">
            Gradient parameters transmitted via secure RPC. No customer PII or transaction histories are exchanged.
          </p>

          <div className="flex items-center justify-center gap-1 text-slate-500 text-xs">
            <ArrowRight size={14} className="text-indigo-400 animate-pulse" />
            <span className="font-mono text-[10px]">FedAvg aggregation</span>
          </div>
        </div>

        {/* Right: Central CredAI Aggregator */}
        <div className="lg:col-span-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-4 space-y-3 relative overflow-hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Cpu size={18} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">CredAI FedAvg Aggregator</h4>
              <p className="text-[11px] text-slate-400">Coordinate descent & parameter consensus</p>
            </div>
          </div>

          <div className="bg-slate-900/70 p-3 rounded-lg border border-white/[0.06] space-y-1.5 font-mono text-[11px]">
            <div className="text-slate-400 flex justify-between">
              <span>Aggregation Rule:</span>
              <span className="text-indigo-300 font-bold">θ_global = Σ (n_k / n) · θ_k</span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Privacy Guarantee:</span>
              <span className="text-emerald-400 font-bold">Zero Data Leakage</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
            <RefreshCw size={12} className="text-indigo-400 shrink-0" />
            <span>Global weights synced back to nodes after round completion</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const qc = useQueryClient();
  const [rounds, setRounds] = useState(3);
  const [fairnessCohort, setFairnessCohort] = useState<'thin_file' | 'gender' | 'income'>('thin_file');

  const { data: dash, isLoading: l1 } = useQuery({ queryKey: ['admin-dashboard'], queryFn: getAdminDashboard });
  const { data: fairness, isLoading: l2 } = useQuery({ queryKey: ['admin-fairness'], queryFn: getFairness });
  const { data: fedRounds } = useQuery({ queryKey: ['fed-rounds'], queryFn: getFederatedRounds });

  const trainMutation = useMutation({
    mutationFn: () => startFederatedTraining(rounds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      qc.invalidateQueries({ queryKey: ['fed-rounds'] });
    },
  });

  if (l1 || l2) {
    return (
      <div className="space-y-6">
        <SkeletonCard className="h-20" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-28" />
        </div>
      </div>
    );
  }

  // Determine active fairness dataset according to selected tab
  const activeCohortData: FairnessCohortData | undefined =
    fairnessCohort === 'thin_file'
      ? (fairness?.thin_file_fairness ?? fairness)
      : fairnessCohort === 'income'
      ? (fairness?.income_type_fairness ?? fairness)
      : fairness;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <SectionHeader
        title="Platform Governance & Telemetry"
        subtitle="Monitor model baselines, trigger multi-party federated training, and inspect algorithmic fairness metrics."
      />

      {/* Top Telemetry Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Applicants"
          value={dash?.total_applicants ?? 0}
          color="blue"
          sub="Registered users"
        />
        <StatCard
          label="Institutions"
          value={dash?.total_institutions ?? 0}
          color="emerald"
          sub="Federated client nodes"
        />
        <StatCard
          label="Assessments"
          value={dash?.total_assessments ?? 0}
          color="purple"
          sub="Evaluations processed"
        />
        <StatCard
          label="System Status"
          value={dash?.system_status ?? 'OPERATIONAL'}
          color={dash?.system_status === 'OPERATIONAL' ? 'emerald' : 'rose'}
          sub="Engine health"
        />
      </div>

      {/* Model Performance Baselines */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Centralized Model Baseline */}
        <div className="card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Cpu size={16} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Centralized Baseline Model</h2>
                  <p className="text-xs text-slate-400">Trained on pooled dataset (XGBoost)</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Baseline
              </span>
            </div>

            {dash?.centralized_metrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(dash.centralized_metrics).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl border border-white/[0.06] bg-slate-900/40 min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block truncate">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-base font-bold font-mono text-slate-200 mt-1 block truncate">
                      {typeof v === 'number' ? (v < 1 && v > 0 ? v.toFixed(4) : v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">No centralized metrics calculated.</p>
            )}
          </div>
        </div>

        {/* Federated Global Model */}
        <div className="card p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Building2 size={16} />
                </div>
                <div>
                  <h2 className="font-bold text-white text-base">Federated Global Model</h2>
                  <p className="text-xs text-slate-400">Aggregated parameters via FedAvg</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                Federated
              </span>
            </div>

            {dash?.federated_metrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries(dash.federated_metrics).map(([k, v]) => (
                  <div key={k} className="p-3 rounded-xl border border-white/[0.06] bg-slate-900/40 min-w-0">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block truncate">
                      {k.replace(/_/g, ' ')}
                    </span>
                    <span className="text-base font-bold font-mono text-indigo-300 mt-1 block truncate">
                      {typeof v === 'number' ? (v < 1 && v > 0 ? v.toFixed(4) : v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4">No federated training rounds run yet. Click below to initiate training.</p>
            )}
          </div>
        </div>
      </div>

      {/* Federated Training Orchestration Panel */}
      <div className="card p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Play size={18} />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">Federated Averaging Orchestrator</h2>
              <p className="text-xs text-slate-400">Execute FedAvg across Bank A, Bank B, and FinTech C without moving local data</p>
            </div>
          </div>
        </div>

        {/* Visual Architecture Diagram */}
        <FedAvgArchitectureDiagram />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 bg-slate-900/40 p-4 rounded-xl border border-white/[0.06]">
          <div className="space-y-1 sm:w-48">
            <label className="label text-xs">Federated Rounds</label>
            <input
              type="number"
              min={1}
              max={20}
              className="input-field font-mono py-2 text-sm"
              value={rounds}
              onChange={e => setRounds(parseInt(e.target.value) || 1)}
            />
          </div>
          <button
            onClick={() => trainMutation.mutate()}
            disabled={trainMutation.isPending}
            className="btn-primary py-2.5 px-6 text-sm font-semibold flex items-center justify-center gap-2 sm:self-end"
          >
            {trainMutation.isPending ? (
              <><Spinner size={16} /> Executing FedAvg Aggregation…</>
            ) : (
              <><Play size={16} /> Start Federated Training</>
            )}
          </button>
        </div>

        {trainMutation.isError && <ErrorMessage message="Federated training run failed. Check server logs." />}

        {trainMutation.isSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-300 flex items-center gap-3">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="leading-relaxed">
              Federated training completed successfully! New Global Model: <strong className="font-mono text-white">{trainMutation.data.global_model_version}</strong> (ROC-AUC: <strong className="font-mono text-white">{trainMutation.data.final_global_metrics?.roc_auc?.toFixed(4)}</strong>)
            </span>
          </div>
        )}

        {/* Federated Rounds Audit Log */}
        {fedRounds && fedRounds.length > 0 && (
          <div className="pt-2">
            <div className="flex items-center gap-2 mb-3">
              <History size={14} className="text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Orchestration Execution Log</h3>
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Round</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Model Version</th>
                    <th className="px-4 py-3 font-semibold">Nodes</th>
                    <th className="px-4 py-3 font-semibold text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04] bg-slate-900/20">
                  {fedRounds.slice(0, 5).map(r => (
                    <tr key={r.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5 font-bold font-mono text-slate-200">Round {r.round_number}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-indigo-300">{r.global_model_version}</td>
                      <td className="px-4 py-2.5 text-slate-400 truncate max-w-[200px]">{r.participating_clients}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-right">{new Date(r.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Algorithmic Fairness Audit */}
      <div className="card p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <ShieldAlert size={16} />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Algorithmic Fairness & Bias Audit</h2>
              <p className="text-xs text-slate-400">Demographic parity & equal opportunity metrics across borrower cohorts</p>
            </div>
          </div>

          {/* Cohort Selector Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900/80 border border-white/[0.08] text-xs">
            <button
              onClick={() => setFairnessCohort('thin_file')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                fairnessCohort === 'thin_file'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={12} />
              <span>Thin-File Status</span>
            </button>
            <button
              onClick={() => setFairnessCohort('gender')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                fairnessCohort === 'gender'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gender Demographics
            </button>
            {fairness?.income_type_fairness && (
              <button
                onClick={() => setFairnessCohort('income')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  fairnessCohort === 'income'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Income Type
              </button>
            )}
          </div>
        </div>

        {activeCohortData ? (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 bg-slate-900/40 p-3 rounded-xl border border-white/[0.06] gap-2">
              <div>
                <span>Audited Cohort Dimension: <strong className="text-indigo-300 font-semibold uppercase ml-1">{activeCohortData.group_attribute}</strong></span>
                {fairnessCohort === 'thin_file' && (
                  <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 font-medium">
                    Core Innovation Metric
                  </span>
                )}
              </div>
              <span className="text-slate-500">Evaluated on held-out model test split</span>
            </div>

            {fairnessCohort === 'thin_file' && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                <Info size={15} className="text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-indigo-300">Thin-File Fairness Dimension:</strong> Measures model decisioning parity between borrowers with no bureau footprint (0 loans, 0 prior applications) versus established credit holders. A lower disparity demonstrates that CredAI's alternative data signals successfully evaluate thin-file applicants without systemic bias.
                </span>
              </div>
            )}

            {/* Group Metric Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(activeCohortData.group_metrics).map(([group, m]) => (
                <div key={group} className="rounded-xl border border-white/[0.06] bg-slate-900/30 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-sm font-bold text-slate-200 truncate">{group}</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700 shrink-0">N = {m.n}</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Approval Rate</span>
                      <span className="font-mono font-semibold text-slate-200">{(m.approval_rate * 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span>True Positive Rate (TPR)</span>
                      <span className="font-mono font-semibold text-slate-200">
                        {m.true_positive_rate !== null ? `${(m.true_positive_rate * 100).toFixed(2)}%` : 'N/A'}
                      </span>
                    </div>
                    {m.false_positive_rate !== undefined && m.false_positive_rate !== null && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>False Positive Rate (FPR)</span>
                        <span className="font-mono font-semibold text-slate-200">{(m.false_positive_rate * 100).toFixed(2)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Disparity Summary Table */}
            <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disparity Summary</h3>
              <div className="grid sm:grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between items-center p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400">Demographic Parity Disparity</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {activeCohortData.demographic_parity_difference.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg border border-white/[0.04] bg-white/[0.01]">
                  <span className="text-slate-400">Equal Opportunity Disparity</span>
                  <span className="font-mono font-bold text-indigo-300 text-sm">
                    {activeCohortData.equal_opportunity_difference !== null
                      ? activeCohortData.equal_opportunity_difference.toFixed(4)
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {fairness?.note && (
              <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-white/[0.04] pt-3">
                Note: {fairness.note}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4">Fairness evaluation unavailable.</p>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
        <Database size={14} className="text-indigo-400 shrink-0" />
        <span>Active Engine Mode: <span className="font-mono text-slate-300 font-semibold">{dash?.data_mode ?? 'Synthetic Home Credit 20k'}</span></span>
      </div>
    </div>
  );
}

