import api, { unwrap } from './api';
import axios from 'axios';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'LEADERSHIP' | 'ADMIN';
  jobRole: string | null;
  onboarded: boolean;
  avatarUrl: string | null;
  managerId: string | null;
  dept: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
}

export async function loginRequest(email: string, password: string, captchaToken?: string) {
  const res = await axios.post('/api/auth/login', { email, password, captchaToken });
  // bare axios bypasses the api interceptor → unwrap the envelope here
  return unwrap<{ accessToken: string; refreshToken: string; user: AuthUser }>(
    res.data,
    res.status,
  );
}

export async function logoutRequest(refreshToken: string) {
  await api.post('/auth/logout', { refreshToken });
}

export async function meRequest(): Promise<AuthUser> {
  const { data } = await api.get('/auth/me');
  return data;
}

/* ── Password reset (server never reveals if the email exists) ── */
export async function requestPasswordReset(
  email: string,
  captchaToken?: string,
): Promise<void> {
  await axios.post('/api/auth/forgot-password', { email, captchaToken });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<void> {
  await axios.post('/api/auth/reset-password', { token, password });
}
