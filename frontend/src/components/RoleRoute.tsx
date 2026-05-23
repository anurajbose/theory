import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

type Role = 'EMPLOYEE' | 'MANAGER' | 'LEADERSHIP' | 'ADMIN';

/**
 * Role guard. Use INSIDE a ProtectedRoute (auth already enforced upstream).
 * Unauthorised roles are redirected, not shown a blank screen.
 */
export default function RoleRoute({ allow }: { allow: Role[] }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return allow.includes(user.role) ? <Outlet /> : <Navigate to="/daily" replace />;
}
