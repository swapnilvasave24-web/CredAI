import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Sparkles, SlidersHorizontal, Shield,
  CreditCard, Activity, HelpCircle, ToggleLeft, ToggleRight, Info
} from 'lucide-react';
import { submitAssessment } from '../services/api';
import type { AssessmentInput } from '../types';
import { ErrorMessage, Spinner, SectionHeader } from '../components/UI';

/** Simple tooltip wrapper */
function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex items-center ml-1">
      <HelpCircle
        size={12}
        className="text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      />
      {show && (
        <span className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 w-56 bg-slate-800 border border-white/10
                          text-xs text-slate-300 rounded-xl px-3 py-2 leading-relaxed shadow-xl pointer-events-none">
          {text}
        </span>
      )}
    </span>
  );
}

const Field = ({
  label, name, value, onChange, min = 0, max, step = 'any', help, suffix, tooltip,
}: {
  label: string; name: string; value: number; onChange: (n: string, v: number) => void;
  min?: number; max?: number; step?: string; help?: string; suffix?: string; tooltip?: string;
}) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <label className="label mb-0 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      {suffix && <span className="text-xs text-indigo-400 font-mono font-medium">{value} {suffix}</span>}
    </div>
    <input type="number" className="input-field font-mono" value={value} min={min} max={max} step={step}
      onChange={e => onChange(name, parseFloat(e.target.value) || 0)} />
    {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
  </div>
);

const RangeField = ({
  label, name, value, onChange, help, tooltip,
}: {
  label: string; name: string; value: number; onChange: (n: string, v: number) => void;
  help?: string; tooltip?: string;
}) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <label className="label mb-0 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <span className="text-xs text-indigo-300 font-mono font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
        {(value * 100).toFixed(0)}% ({value.toFixed(2)})
      </span>
    </div>
    <input
      type="range" min="0" max="1" step="0.01" value={value}
      onChange={e => onChange(name, parseFloat(e.target.value))}
      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
    />
    {help && <p className="text-xs text-slate-500 mt-1">{help}</p>}
  </div>
);

const THIN_FILE_DEFAULTS: AssessmentInput = {
  monthly_income: 25000, requested_credit_amount: 100000, monthly_annuity: 4000,
  bureau_loan_count: 0, bureau_overdue_ratio: 0.0, prev_application_count: 0,
  prev_approval_rate: 0.0, installment_late_ratio: 0.0, installment_avg_days_late: 0.0,
  ext_source_1: 0.0, ext_source_2: 0.0, ext_source_3: 0.0,
  syn_upi_txn_count_monthly: 30, syn_avg_txn_amount: 800, syn_txn_consistency: 0.75,
  syn_utility_payment_reliability: 0.85, syn_monthly_savings_rate: 0.12, syn_income_stability_score: 0.65,
};

const STANDARD_DEFAULTS: AssessmentInput = {
  monthly_income: 50000, requested_credit_amount: 300000, monthly_annuity: 10000,
  bureau_loan_count: 1, bureau_overdue_ratio: 0.0, prev_application_count: 1,
  prev_approval_rate: 0.8, installment_late_ratio: 0.0, installment_avg_days_late: 0.0,
  ext_source_1: 0.6, ext_source_2: 0.6, ext_source_3: 0.6,
  syn_upi_txn_count_monthly: 25, syn_avg_txn_amount: 1000, syn_txn_consistency: 0.7,
  syn_utility_payment_reliability: 0.8, syn_monthly_savings_rate: 0.1, syn_income_stability_score: 0.7,
};

export default function FinancialAssessment() {
  const navigate = useNavigate();
  const [thinFileMode, setThinFileMode] = useState(false);
  const [form, setForm] = useState<AssessmentInput>(STANDARD_DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (name: string, value: number) => setForm(f => ({ ...f, [name]: value }));

  const toggleThinFile = () => {
    const next = !thinFileMode;
    setThinFileMode(next);
    setForm(next ? THIN_FILE_DEFAULTS : STANDARD_DEFAULTS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const result = await submitAssessment(form);
      navigate(`/result/${result.id}`, { state: result });
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(typeof d === 'string' ? d : 'Assessment failed. Please check your financial inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Financial Profile & Credit Assessment"
        subtitle="Provide your financial parameters for privacy-preserving score evaluation"
      />

      {/* Privacy guarantee banner */}
      <div className="rounded-xl border border-white/[0.06] bg-slate-900/50 p-4 text-xs text-slate-400 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">Privacy Guarantee:</strong> Inputs are evaluated securely.
          Synthetic fields simulate alternative credit metrics (UPI, utility reliability) without storing raw banking credentials.
        </span>
      </div>

      {/* ── Thin-File Toggle ─────────────────────────────────────── */}
      <div
        className={`rounded-2xl border p-5 flex items-start gap-4 cursor-pointer transition-all duration-300 select-none
          ${thinFileMode
            ? 'border-indigo-500/40 bg-indigo-500/8'
            : 'border-white/[0.06] bg-slate-900/40 hover:border-white/10'}`}
        onClick={toggleThinFile}
        role="button"
        aria-pressed={thinFileMode}
      >
        <div className={`mt-0.5 transition-colors ${thinFileMode ? 'text-indigo-400' : 'text-slate-500'}`}>
          {thinFileMode ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className={`text-sm font-semibold ${thinFileMode ? 'text-indigo-300' : 'text-slate-300'}`}>
              I have little or no credit history (Thin-File Mode)
            </p>
            {thinFileMode && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full
                               bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                Active
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Enable this if you are a first-time borrower, gig worker, or MSME owner with no formal loan history.
            Bureau fields will be set to zero and CredAI will evaluate you <strong className="text-slate-400">primarily
            through alternative signals</strong> — UPI activity, utility payments, and savings behaviour.
          </p>
        </div>
      </div>

      {thinFileMode && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 flex items-start gap-3">
          <Info size={15} className="text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-300 leading-relaxed">
            <strong>Thin-File Mode active.</strong> Bureau fields (loan count, overdue ratio, external scores) have been set to 0.
            Your score will be driven by the <strong>Alternative Financial Signals</strong> section below.
            This demonstrates how CredAI breaks the "No history → No loan" cycle.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Core Financials */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <CreditCard size={18} className="text-indigo-400" />
            <h2 className="font-semibold text-white text-base">Core Financial Profile</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Monthly Income" name="monthly_income" value={form.monthly_income} onChange={set} min={1000}
              help="Gross monthly earnings in ₹" suffix="₹"
              tooltip="Your total monthly income before tax deductions. Include salary, freelance, or business revenue." />
            <Field label="Requested Credit" name="requested_credit_amount" value={form.requested_credit_amount} onChange={set} min={1000}
              help="Target loan/credit limit" suffix="₹"
              tooltip="The total loan amount you wish to borrow. A lower amount relative to your income improves your score." />
            <Field label="Monthly Annuity (EMI)" name="monthly_annuity" value={form.monthly_annuity} onChange={set} min={0}
              help="Proposed monthly installment" suffix="₹"
              tooltip="Your proposed monthly repayment amount (EMI). Should ideally be under 40% of your monthly income." />
          </div>
        </div>

        {/* Section 2: Credit Bureau History */}
        <div className={`card p-6 space-y-4 transition-opacity duration-300 ${thinFileMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-indigo-400" />
              <h2 className="font-semibold text-white text-base">Credit Bureau Track Record</h2>
            </div>
            {thinFileMode && (
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                Zeroed — Thin-File Mode
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Bureau Loan Count" name="bureau_loan_count" value={form.bureau_loan_count} onChange={set} min={0} step="1"
              help="Active & historical loans"
              tooltip="Total number of loans ever taken (active + closed). Enter 0 if you have never taken a loan." />
            <RangeField label="Bureau Overdue Ratio" name="bureau_overdue_ratio" value={form.bureau_overdue_ratio} onChange={set}
              help="0% = never overdue, 100% = all overdue"
              tooltip="Fraction of your bureau loans that went overdue. Lower is better. First-time borrowers: set to 0." />
            <Field label="Prev Applications" name="prev_application_count" value={form.prev_application_count} onChange={set} min={0} step="1"
              tooltip="How many loan applications have you previously submitted across banks?" />
            <RangeField label="Prev Approval Rate" name="prev_approval_rate" value={form.prev_approval_rate} onChange={set}
              help="Historical approval ratio"
              tooltip="Fraction of your past loan applications that were approved. If you've never applied, set to 0." />
            <RangeField label="Installment Late Ratio" name="installment_late_ratio" value={form.installment_late_ratio} onChange={set}
              help="Fraction of late payments"
              tooltip="What fraction of your past loan installments were paid late? 0 = always on time." />
            <Field label="Avg Days Late" name="installment_avg_days_late" value={form.installment_avg_days_late} onChange={set} min={0}
              help="Average days overdue" suffix="days"
              tooltip="On average, how many days late were overdue payments? Enter 0 if always on time." />
          </div>
        </div>

        {/* Section 3: External Scores */}
        <div className={`card p-6 space-y-4 transition-opacity duration-300 ${thinFileMode ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              <div>
                <h2 className="font-semibold text-white text-base">External Credit Benchmarks</h2>
                <p className="text-xs text-slate-400">Normalized bureau signals (0.0 = no/low score, 1.0 = prime credit)</p>
              </div>
            </div>
            {thinFileMode && (
              <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                Zeroed — Thin-File Mode
              </span>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <RangeField label="External Source 1" name="ext_source_1" value={form.ext_source_1} onChange={set}
              help="Primary bureau model"
              tooltip="A normalized credit score from a primary bureau (e.g., CIBIL). If you have no credit history, set to 0." />
            <RangeField label="External Source 2" name="ext_source_2" value={form.ext_source_2} onChange={set}
              help="Secondary bureau model"
              tooltip="A normalized score from a secondary bureau or scoring model. Set to 0 if unavailable." />
            <RangeField label="External Source 3" name="ext_source_3" value={form.ext_source_3} onChange={set}
              help="Alternative score indicator"
              tooltip="An alternative external score indicator. Set to 0 if you have no credit history." />
          </div>
          {!thinFileMode && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Info size={11} />
              No credit score? Enable <button type="button" className="text-indigo-400 underline" onClick={toggleThinFile}>Thin-File Mode</button> above to set these to 0 automatically.
            </p>
          )}
        </div>

        {/* Section 4: Synthetic Alternative Data */}
        <div className="card p-6 space-y-4 border-indigo-500/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 relative">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-indigo-400" />
              <div>
                <h2 className="font-semibold text-white text-base">Alternative Financial Signals</h2>
                {thinFileMode && (
                  <p className="text-xs text-indigo-400 font-medium mt-0.5">
                    ✦ Primary scoring signals in Thin-File Mode
                  </p>
                )}
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Synthetic Prototype Signal
            </span>
          </div>
          <div className="grid md:grid-cols-3 gap-5 relative">
            <Field label="Monthly UPI Txn Count" name="syn_upi_txn_count_monthly" value={form.syn_upi_txn_count_monthly}
              onChange={set} min={0} step="1"
              tooltip="How to find this: Open PhonePe / Google Pay → Statement → count all transactions this month." />
            <Field label="Avg Txn Amount" name="syn_avg_txn_amount" value={form.syn_avg_txn_amount}
              onChange={set} min={0} suffix="₹"
              tooltip="Your average UPI transaction size in ₹. Higher average amounts suggest stronger purchasing power." />
            <RangeField label="Transaction Consistency" name="syn_txn_consistency" value={form.syn_txn_consistency}
              onChange={set} help="Regularity of cash inflows"
              tooltip="How consistently do you transact? Regular daily/weekly activity = high score. Sporadic = low. Estimate: consistent daily use ≈ 0.8+." />
            <RangeField label="Utility Reliability" name="syn_utility_payment_reliability" value={form.syn_utility_payment_reliability}
              onChange={set} help="On-time bill payments"
              tooltip="What fraction of your electricity, gas, water, and mobile bills were paid on time? Check your utility app payment history." />
            <RangeField label="Monthly Savings Rate" name="syn_monthly_savings_rate" value={form.syn_monthly_savings_rate}
              onChange={set} help="Income saved monthly"
              tooltip="What % of your income do you save each month? e.g. saving ₹3,000 on ₹25,000 income = 12% → enter 0.12." />
            <RangeField label="Income Stability Score" name="syn_income_stability_score" value={form.syn_income_stability_score}
              onChange={set} help="Employment & revenue consistency"
              tooltip="How stable is your income source? Regular salaried = 0.8–1.0. Freelance with consistent clients = 0.5–0.7. Irregular = 0.2–0.4." />
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex items-center justify-center gap-2 px-8 py-3 text-base">
            {loading ? <><Spinner size={18} /> Calculating CredAI Score…</> : <><Sparkles size={18} /> Run Credit Assessment</>}
          </button>
          <button type="button" className="btn-secondary py-3 px-6"
            onClick={() => setForm(thinFileMode ? THIN_FILE_DEFAULTS : STANDARD_DEFAULTS)}>
            Reset Defaults
          </button>
        </div>
      </form>
    </div>
  );
}
