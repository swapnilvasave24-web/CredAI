import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Spinner } from '../components/UI';

export default function Login() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [devOpen,  setDevOpen]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = JSON.parse(localStorage.getItem('credai_user') ?? '{}');
      if (user.role === 'ADMIN')       navigate('/admin');
      else if (user.role === 'INSTITUTION') navigate('/institution');
      else                             navigate('/dashboard');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email: string) => {
    setEmail(email);
    setPassword('DemoPass123!');
    setDevOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 60%, #0c0f1d 100%)' }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 bg-violet-600/15 rounded-full blur-3xl" />
        </div>
        <Link to="/" className="relative flex items-center gap-2.5 z-10">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/60">
            <ShieldCheck size={18} className="text-white" />
          </div>
          <span className="font-bold text-white text-xl tracking-tight">CredAI</span>
        </Link>
        <div className="relative z-10">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Privacy-First<br />Credit Intelligence
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-xs">
            Powered by federated machine learning and SHAP explainability. Your data stays with you.
          </p>
        </div>
        <div className="relative z-10 text-xs text-slate-600">
          Not an official credit bureau score · For demonstration only
        </div>
      </div>

      {/* Right panel — form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg">CredAI</span>
          </Link>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-slate-400 mb-8">Sign in to your account</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input type="email" required className="input-field" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} required className="input-field pr-11"
                  value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <ErrorMessage message={error} />}

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3">
              {loading ? <><Spinner size={16} /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          {/* Dev accounts collapsible */}
          <div className="mt-6 rounded-xl border border-white/[0.06] overflow-hidden">
            <button
              onClick={() => setDevOpen(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-xs
                         text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors">
              <span>Dev / demo accounts</span>
              <ChevronDown size={14} className={`transition-transform ${devOpen ? 'rotate-180' : ''}`} />
            </button>
            {devOpen && (
              <div className="px-4 pb-3 space-y-1.5 border-t border-white/[0.04]">
                {[
                  { label: 'Applicant',    email: 'applicant@demo.credai.app' },
                  { label: 'Institution',  email: 'banka@demo.credai.app' },
                  { label: 'Admin',        email: 'admin@demo.credai.app' },
                ].map(({ label, email: e }) => (
                  <button key={e} onClick={() => fillDemo(e)}
                    className="w-full flex items-center justify-between text-xs px-3 py-2
                               rounded-lg hover:bg-white/[0.05] text-slate-400
                               hover:text-slate-200 transition-colors">
                    <span>{label}</span>
                    <span className="text-slate-600">{e}</span>
                  </button>
                ))}
                <p className="text-[10px] text-slate-600 pt-1">Password: DemoPass123!</p>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
