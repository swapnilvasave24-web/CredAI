import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

export default function ProtectedRoute({ children, allow }: { children: React.ReactNode; allow: Role[] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user && !allow.includes(user.role)) {
    // Role mismatch -> send to their own home, not a blank page
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'INSTITUTION' ? '/institution' : '/dashboard';
    return <Navigate to={home} replace />;
  }
  return <>{children}</>;
}
