import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App';
import { ThemeProvider } from './theme/ThemeProvider';
import { CLERK_PUBLISHABLE_KEY, clerkEnabled } from './auth/clerk';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// If VITE_GOOGLE_CLIENT_ID is not set, GoogleOAuthProvider still renders fine
// but the Google login button will show a "not configured" toast
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string || 'not-configured';

// Clerk dark theme tuned to the THEORY editorial palette.
const CLERK_APPEARANCE = {
  variables: {
    colorPrimary: '#7C3AED',
    colorBackground: '#0B1020',
    colorText: '#F8FAFC',
    colorTextSecondary: '#94A3B8',
    colorInputBackground: 'rgba(255,255,255,0.04)',
    colorInputText: '#F8FAFC',
    borderRadius: '12px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3500,
            style: { fontFamily: 'Inter, sans-serif', fontSize: '13px', borderRadius: '12px' },
            success: { style: { background: '#22c55e', color: '#fff' } },
            error:   { style: { background: '#ef4444', color: '#fff' } },
          }}
        />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    {clerkEnabled() ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY!} appearance={CLERK_APPEARANCE}>
        <Shell>
          <ErrorBoundary scope="root">
            <App />
          </ErrorBoundary>
        </Shell>
      </ClerkProvider>
    ) : (
      <Shell>
        <ErrorBoundary scope="root">
          <App />
        </ErrorBoundary>
      </Shell>
    )}
  </React.StrictMode>
);
