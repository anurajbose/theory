import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useAuthStore } from '../store/authStore';
import { clerkEnabled } from '../auth/clerk';
import { meRequest } from '../services/authService';

/* Loading shim shared by both modes. */
function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-teal/30 border-t-teal rounded-full animate-spin" />
    </div>
  );
}

/* Clerk-mode gate: trusts Clerk for signed-in state, then hydrates our
   own AuthUser (role/tenant/etc.) from /api/auth/me on first sight. */
function ClerkProtected() {
  const { isLoaded, isSignedIn } = useAuth();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && !user) {
      meRequest()
        .then((u) => setUser(u))
        .catch(() => { /* api interceptor handles 401/403 (NO_ORG redirect) */ });
    }
    if (isLoaded && !isSignedIn && user) setUser(null);
  }, [isLoaded, isSignedIn, user, setUser]);

  if (!isLoaded) return <Spinner />;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (!user) return <Spinner />;
  return <Outlet />;
}

/* Legacy JWT gate — unchanged behaviour. */
function LegacyProtected() {
  const { user, initialized } = useAuthStore();
  if (!initialized) return <Spinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function ProtectedRoute() {
  return clerkEnabled() ? <ClerkProtected /> : <LegacyProtected />;
}
