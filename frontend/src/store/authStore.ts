import { create } from 'zustand';
import { AuthUser, loginRequest, logoutRequest, meRequest } from '../services/authService';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  /** Used by SSO flows (Google, Microsoft) to inject tokens directly */
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void;
  /** Used by Clerk bootstrap — token lives in Clerk, not localStorage */
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  login: async (email, password, captchaToken) => {
    set({ loading: true });
    try {
      const { accessToken, refreshToken, user } = await loginRequest(email, password, captchaToken);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      set({ user, loading: false });
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken') || '';
    try { await logoutRequest(refreshToken); } catch { /* silent */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },

  setAuth: (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user });
  },

  setUser: (user) => set({ user, initialized: true }),

  hydrate: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ initialized: true }); return; }
    try {
      const user = await meRequest();
      set({ user, initialized: true });
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ initialized: true });
    }
  },
}));
