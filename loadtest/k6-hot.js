/*
 * THEORY — k6 load profile for hot read paths.
 * Run (against a running env, never prod without sign-off):
 *   k6 run -e BASE_URL=http://localhost:4000 -e EMAIL=admin@theory.in -e PASS=Theory@123 loadtest/k6-hot.js
 * Or dockerised:
 *   docker run --rm -i -e BASE_URL=... -e EMAIL=... -e PASS=... grafana/k6 run - <loadtest/k6-hot.js
 *
 * Thresholds gate the run: build/stage fails if SLOs are breached.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE = __ENV.BASE_URL || 'http://localhost:4000';
const EMAIL = __ENV.EMAIL || 'admin@theory.in';
const PASS = __ENV.PASS || 'Theory@123';

export const options = {
  scenarios: {
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 25 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // <1% errors
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    'http_req_duration{ep:login}': ['p(95)<1200'],
  },
};

function envelope(res) {
  try { return JSON.parse(res.body); } catch { return {}; }
}

export function setup() {
  const res = http.post(
    `${BASE}/api/auth/login`,
    JSON.stringify({ email: EMAIL, password: PASS }),
    { headers: { 'Content-Type': 'application/json' }, tags: { ep: 'login' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  const data = envelope(res).data || {};
  return { token: data.accessToken };
}

export default function (ctx) {
  const auth = { headers: { Authorization: `Bearer ${ctx.token}` } };

  const hot = [
    { url: `${BASE}/api/work-items?page=1&pageSize=20`, ep: 'workitems' },
    { url: `${BASE}/api/notifications?page=1&pageSize=20`, ep: 'notifications' },
    { url: `${BASE}/api/search?type=workitem&q=task&page=1&pageSize=10`, ep: 'search' },
    { url: `${BASE}/api/manager/overview`, ep: 'manager' },
  ];
  for (const h of hot) {
    const r = http.get(h.url, { ...auth, tags: { ep: h.ep } });
    check(r, { [`${h.ep} ok`]: (x) => x.status === 200 || x.status === 403 });
  }
  sleep(1);
}
