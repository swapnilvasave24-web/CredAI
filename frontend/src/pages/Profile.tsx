import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Spinner, SkeletonCard, SectionHeader } from '../components/UI';
import { User, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery({ queryKey: ['profile'], queryFn: getProfile });

  const [form, setForm] = useState({
    age: '', employment_type: '', education_level: '', family_status: '', housing_type: '', employment_years: '',
  });
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        age: profile.age?.toString() ?? '',
        employment_type: profile.employment_type ?? '',
        education_level: profile.education_level ?? '',
        family_status: profile.family_status ?? '',
        housing_type: profile.housing_type ?? '',
        employment_years: profile.employment_years?.toString() ?? '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () => updateProfile({
      age: form.age ? Number(form.age) : null,
      employment_type: form.employment_type || null,
      education_level: form.education_level || null,
      family_status: form.family_status || null,
      housing_type: form.housing_type || null,
      employment_years: form.employment_years ? Number(form.employment_years) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) return <SkeletonCard className="h-96" />;

  return (
    <div className="space-y-6">
      <SectionHeader title="Account & Profile Settings" subtitle="Manage your personal profile and account credentials" />

      {/* Account Info */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <User size={18} className="text-indigo-400" />
          <h2 className="font-semibold text-white text-base">Account Identity</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-500 mb-1">Full Name</p>
            <p className="font-semibold text-slate-200">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Email Address</p>
            <p className="font-semibold text-slate-200">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Role / Access</p>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <ShieldCheck size={12} /> {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }} className="card p-6 space-y-5">
        <div className="border-b border-white/[0.06] pb-3">
          <h2 className="font-semibold text-white text-base">Demographics & Employment</h2>
          <p className="text-xs text-slate-400">Used for model baseline calibration</p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="label">Age</label>
            <input type="number" min={18} max={100} className="input-field" value={form.age}
              onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="35" />
          </div>
          <div>
            <label className="label">Employment Years</label>
            <input type="number" min={0} step="0.1" className="input-field" value={form.employment_years}
              onChange={e => setForm(f => ({ ...f, employment_years: e.target.value }))} placeholder="5.5" />
          </div>
          <div>
            <label className="label">Employment Type</label>
            <select className="input-field" value={form.employment_type}
              onChange={e => setForm(f => ({ ...f, employment_type: e.target.value }))}>
              <option value="" className="bg-slate-900">Select employment type…</option>
              {['Working', 'Self-employed', 'State servant', 'Commercial associate', 'Pensioner', 'Unemployed'].map(o =>
                <option key={o} value={o} className="bg-slate-900">{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Education Level</label>
            <select className="input-field" value={form.education_level}
              onChange={e => setForm(f => ({ ...f, education_level: e.target.value }))}>
              <option value="" className="bg-slate-900">Select education level…</option>
              {['Secondary', 'Higher education', 'Incomplete higher', 'Lower secondary', 'Academic degree'].map(o =>
                <option key={o} value={o} className="bg-slate-900">{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Family Status</label>
            <select className="input-field" value={form.family_status}
              onChange={e => setForm(f => ({ ...f, family_status: e.target.value }))}>
              <option value="" className="bg-slate-900">Select family status…</option>
              {['Married', 'Single / not married', 'Civil marriage', 'Separated', 'Widow'].map(o =>
                <option key={o} value={o} className="bg-slate-900">{o}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Housing Type</label>
            <select className="input-field" value={form.housing_type}
              onChange={e => setForm(f => ({ ...f, housing_type: e.target.value }))}>
              <option value="" className="bg-slate-900">Select housing type…</option>
              {['House / apartment', 'Rented apartment', 'With parents', 'Municipal apartment', 'Co-op apartment'].map(o =>
                <option key={o} value={o} className="bg-slate-900">{o}</option>)}
            </select>
          </div>
        </div>

        {mutation.isError && <ErrorMessage message="Failed to update profile." />}
        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 size={16} /> Profile updated successfully.
          </div>
        )}

        <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-2 px-6 py-2.5">
          {mutation.isPending ? <><Spinner size={16} /> Saving changes…</> : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}
