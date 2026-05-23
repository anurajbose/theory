import axios, { AxiosResponse } from 'axios';
import toast from 'react-hot-toast';
import { clerkEnabled, getClerkToken } from '../auth/clerk';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/* ── Envelope handling ──────────────────────────────────────────────
   Backend standardised every /api response to { success, data, meta, error }.
   We unwrap centrally so all 16 services keep doing `const {data}=...; return data`
   unchanged — `data` is now the real payload. Errors normalise to ApiError. */

export interface ApiErrorShape {
  code: string;
  message: string;
  details?: unknown;
}
export class ApiError extends Error {
  code: string;
  details?: unknown;
  status?: number;
  constructor(e: ApiErrorShape, status?: number) {
    super(e.message);
    this.code = e.code;
    this.details = e.details;
    this.status = status;
  }
}

function isEnvelope(
  b: unknown,
): b is { success: boolean; data: unknown; meta: unknown; error: ApiErrorShape | null } {
  return !!b && typeof b === 'object' && 'success' in b && 'data' in b && 'error' in b;
}

/** Unwrap an enveloped body; throw ApiError on success:false. */
export function unwrap<T>(body: unknown, status?: number): T {
  if (!isEnvelope(body)) return body as T;
  if (!body.success) {
    throw new ApiError(body.error ?? { code: 'ERROR', message: 'Request failed' }, status);
  }
  return body.data as T;
}

api.interceptors.request.use(async (config) => {
  // Prefer a live Clerk session token when Clerk is enabled. The legacy
  // localStorage JWT remains the fallback so the demo keeps working until
  // the workspace cuts over.
  let token: string | null = null;
  if (clerkEnabled()) token = await getClerkToken();
  if (!token) token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let refreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (res: AxiosResponse) => {
    if (isEnvelope(res.data)) {
      if (!res.data.success) {
        return Promise.reject(
          new ApiError(res.data.error ?? { code: 'ERROR', message: 'Request failed' }, res.status),
        );
      }
      (res as AxiosResponse & { meta?: unknown }).meta = res.data.meta;
      res.data = res.data.data;
    }
    return res;
  },
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original?._retry) {
      original._retry = true;

      if (refreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          });
        });
      }

      refreshing = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const resp = await axios.post('/api/auth/refresh', { refreshToken });
        const tokens = unwrap<{ accessToken: string; refreshToken: string }>(
          resp.data,
          resp.status,
        );
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);

        refreshQueue.forEach((cb) => cb(tokens.accessToken));
        refreshQueue = [];

        original.headers.Authorization = `Bearer ${tokens.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      } finally {
        refreshing = false;
      }
    }

    const env = err.response?.data;
    const message =
      (isEnvelope(env) && env.error?.message) ||
      env?.error?.message ||
      env?.error ||
      'Something went wrong';

    // Plan gate — server says this needs a higher tier. Route the
    // user to the upgrade surface instead of a dead error.
    if (
      err.response?.status === 402 &&
      !window.location.pathname.startsWith('/upgrade')
    ) {
      const errObj = (isEnvelope(env) ? env.error : env?.error) as
        | { code?: string; details?: { required?: string } }
        | undefined;
      if (errObj?.code === 'PLAN_REQUIRED') {
        const required = errObj.details?.required ?? 'PRO';
        window.location.href = `/upgrade?required=${required}`;
        return Promise.reject(err);
      }
    }

    // Clerk user is authenticated but has no active organization — send
    // them to the workspace-setup page so they can create or pick one.
    if (
      err.response?.status === 403 &&
      !window.location.pathname.startsWith('/workspace-setup')
    ) {
      const e = (isEnvelope(env) ? env.error : env?.error) as
        | { code?: string }
        | undefined;
      if (e?.code === 'NO_ORG') {
        window.location.href = '/workspace-setup';
        return Promise.reject(err);
      }
    }

    if (err.response?.status >= 500) toast.error(message);
    return Promise.reject(err);
  },
);

export default api;
