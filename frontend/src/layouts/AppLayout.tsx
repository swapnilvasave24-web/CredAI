import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShieldCheck, LogOut, LayoutDashboard, ClipboardList,
  History, User, Building2, Settings, Activity,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };

  const applicantNav = [
    { to: '/dashboard',   label: 'Dashboard',       icon: LayoutDashboard },
    { to: '/assessment',  label: 'New Assessment',   icon: ClipboardList },
    { to: '/history',     label: 'History',          icon: History },
    { to: '/profile',     label: 'Profile',          icon: User },
  ];

  const institutionNav = [
    { to: '/institution',           label: 'Dashboard',          icon: Building2 },
    { to: '/institution/federated', label: 'Federated Training', icon: Activity },
  ];

  const adminNav = [
    { to: '/admin', label: 'Admin Panel', icon: Settings },
  ];

  const nav =
    user?.role === 'APPLICANT'   ? applicantNav :
    user?.role === 'INSTITUTION' ? institutionNav : adminNav;

  const roleColor =
    user?.role === 'APPLICANT'   ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' :
    user?.role === 'INSTITUTION' ? 'text-violet-400 bg-violet-500/10 border-violet-500/20' :
                                   'text-amber-400 bg-amber-500/10 border-amber-500/20';

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className="w-60 flex flex-col fixed h-full z-20 border-r border-white/[0.06]"
        style={{ background: 'linear-gradient(180deg, #0c0f1d 0%, #0f172a 100%)' }}>

        {/* Brand */}
        <div className="px-5 py-6 border-b border-white/[0.06]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center
                            shadow-lg shadow-indigo-900/50 group-hover:bg-indigo-500 transition-colors">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">CredAI</span>
              <p className="text-[10px] text-slate-500 leading-none mt-0.5">Credit Intelligence</p>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to ||
              (to !== '/dashboard' && to !== '/admin' && to !== '/institution' &&
               location.pathname.startsWith(to));
            return (
              <Link key={to} to={to}
                className={`nav-link ${active ? 'nav-link-active' : ''}`}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600
                            flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-200 truncate">{user?.name}</p>
              <span className={`mt-0.5 inline-block text-[10px] px-1.5 py-0.5 rounded border font-medium ${roleColor}`}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-rose-400
                       transition-colors w-full px-1 py-1.5 rounded-lg hover:bg-rose-500/5">
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────── */}
      <main className="flex-1 ml-60 min-h-screen">
        <div className="max-w-5xl mx-auto px-8 py-8 page-enter">
          {children}
        </div>
      </main>
    </div>
  );
}
