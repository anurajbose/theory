import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useTimeTheme } from './hooks/useTimeTheme';
import Login          from './pages/Login';
import { ForgotPassword, ResetPassword } from './pages/PasswordReset';
import { ClerkSignInPage, ClerkSignUpPage, WorkspaceSetupPage } from './pages/auth/ClerkAuthPages';
import Onboarding     from './pages/Onboarding';
import Daily          from './pages/Daily';
import Signals        from './pages/Signals';
import Intelligence   from './pages/Intelligence';
import Upgrade        from './pages/Upgrade';
import BoardPage      from './pages/Board';
import FollowUpsPage  from './pages/FollowUps';
import TimeLogPage    from './pages/TimeLog';
import MeetingsPage   from './pages/Meetings';
import IdeasPage      from './pages/Ideas';
import ManagerPage        from './pages/Manager';
import OrgPulsePage       from './pages/OrgPulse';
import KnowledgeBasePage  from './pages/KnowledgeBase';
import AdminPage          from './pages/Admin';
import ReportsPage        from './pages/Reports';
import AppLayout      from './components/layout/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import RoleRoute       from './components/RoleRoute';
import Landing         from './pages/marketing/Landing';
import HowItWorks      from './pages/marketing/HowItWorks';
import Pricing         from './pages/marketing/Pricing';

// Public home: marketing landing for visitors; authed users go to the app.
function Home() {
  const { user, initialized } = useAuthStore();
  if (initialized && user) return <Navigate to="/daily" replace />;
  return <Landing />;
}

export default function App() {
  const hydrate = useAuthStore((s) => s.hydrate);
  useEffect(() => { hydrate(); }, [hydrate]);
  useTimeTheme(); // applies dark/light class + provides toggle

  return (
    <Routes>
      {/* Public — legacy JWT auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Public — Clerk auth (active when VITE_CLERK_PUBLISHABLE_KEY is set) */}
      <Route path="/sign-in/*" element={<ClerkSignInPage />} />
      <Route path="/sign-up/*" element={<ClerkSignUpPage />} />
      <Route path="/workspace-setup" element={<WorkspaceSetupPage />} />

      {/* Onboarding (auth required, but no sidebar layout) */}
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
      </Route>

      {/* App shell — sidebar + header */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/daily"      element={<Daily />} />
          <Route path="/signals"    element={<Signals />} />
          <Route path="/upgrade"    element={<Upgrade />} />
          <Route path="/board"      element={<BoardPage />} />
          <Route path="/follow-ups" element={<FollowUpsPage />} />
          <Route path="/time-log"   element={<TimeLogPage />} />
          <Route path="/meetings"   element={<MeetingsPage />} />
          <Route path="/ideas"      element={<IdeasPage />} />
          <Route path="/kb"         element={<KnowledgeBasePage />} />

          {/* Intelligence — one role-adaptive surface that replaces
              Manager / Org Pulse / Reports. Legacy URLs redirect. */}
          <Route element={<RoleRoute allow={['MANAGER', 'LEADERSHIP', 'ADMIN']} />}>
            <Route path="/intelligence" element={<Intelligence />} />
            <Route path="/manager"      element={<Navigate to="/intelligence" replace />} />
            <Route path="/org-pulse"    element={<Navigate to="/intelligence" replace />} />
            <Route path="/reports"      element={<Navigate to="/intelligence" replace />} />
          </Route>
          <Route element={<RoleRoute allow={['ADMIN']} />}>
            <Route path="/admin"      element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      {/* Public marketing */}
      <Route path="/" element={<Home />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
