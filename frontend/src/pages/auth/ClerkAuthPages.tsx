import { SignIn, SignUp, CreateOrganization, useOrganizationList } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';

/* ═══════════════════════════════════════════════════════════════
   Clerk auth surfaces, dressed in the THEORY editorial dark canvas.
   Three pages: sign-in, sign-up, and a workspace gate that forces
   org context (our backend rejects requests without an org).
   ═══════════════════════════════════════════════════════════════ */

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dot-canvas min-h-screen flex items-center justify-center px-4">
      <div className="dot-grid dot-grid-2x dot-drift" aria-hidden />
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-[1]"
      >
        {children}
      </motion.div>
    </div>
  );
}

export function ClerkSignInPage() {
  return (
    <AuthShell>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/daily"
      />
    </AuthShell>
  );
}

export function ClerkSignUpPage() {
  return (
    <AuthShell>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        afterSignUpUrl="/workspace-setup"
      />
    </AuthShell>
  );
}

/* Workspace gate — a user can only enter the app once they belong to
   (or have just created) an organisation. This page is the single place
   that turns a brand-new Clerk account into a THEORY tenant. */
export function WorkspaceSetupPage() {
  const { isLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: false },
  });

  if (!isLoaded) return null;

  // Already in an org → drop into the app.
  if (userMemberships?.data && userMemberships.data.length > 0) {
    const first = userMemberships.data[0];
    void setActive?.({ organization: first.organization.id });
    return <Navigate to="/daily" replace />;
  }

  return (
    <AuthShell>
      <div className="surface-float p-8 max-w-[460px]">
        <h1 className="text-hero mb-1.5" style={{ color: 'var(--m3-on-surf)' }}>
          Create your workspace
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--m3-on-surf-var)' }}>
          THEORY runs per organisation. Set yours up now — you can invite
          teammates afterwards.
        </p>
        <CreateOrganization
          afterCreateOrganizationUrl="/daily"
          skipInvitationScreen
        />
      </div>
    </AuthShell>
  );
}
