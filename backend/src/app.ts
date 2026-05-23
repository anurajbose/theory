import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { apiLimiter } from './middleware/rateLimit';
import authRoutes       from './routes/auth';
import brandingRoutes   from './routes/branding';
import commentRoutes    from './routes/comments';
import activityRoutes   from './routes/activity';
import searchRoutes     from './routes/search';
import aiRoutes         from './routes/ai';
import exportRoutes     from './routes/exports';
import billingRoutes    from './routes/billing';
import hierarchyRoutes  from './routes/hierarchy';
import dailyLogRoutes   from './routes/dailyLog';
import onboardingRoutes from './routes/onboarding';
import workItemRoutes   from './routes/workItems';
import followUpRoutes   from './routes/followUps';
import timeLogRoutes    from './routes/timeLogs';
import meetingRoutes    from './routes/meetings';
import ideaRoutes            from './routes/ideas';
import notificationRoutes   from './routes/notifications';
import managerRoutes         from './routes/manager';
import signalsRoutes         from './routes/signals';
import leadershipRoutes      from './routes/leadership';
import kbRoutes              from './routes/kb';
import announcementRoutes    from './routes/announcements';
import adminRoutes           from './routes/admin';
import reportsRoutes         from './routes/reports';
import invisibleEffortRoutes from './routes/invisibleEffort';
import { errorHandler, fail } from './core/http';
import { envelope } from './core/envelope';
import { buildOpenApi } from './core/openapi';
import { metricsMiddleware } from './observability/metrics';
import { httpLogger } from './utils/logger';
import observabilityRoutes from './routes/observability';
import { buildQueueDashboard } from './queue/dashboard';

const app = express();

// Security headers — strict (JSON API; no inline assets served here)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
    frameguard: { action: 'deny' },
  }),
);
app.disable('x-powered-by');

// CORS — whitelist only
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(
  express.json({
    limit: '2mb',
    // stash raw body so billing webhooks can HMAC-verify the exact bytes
    verify: (req, _res, buf) => { (req as unknown as { rawBody?: Buffer }).rawBody = buf; },
  }),
);
app.use(express.urlencoded({ extended: true }));

// Observability — measure + log EVERY request (incl. rate-limited)
app.use(metricsMiddleware);
app.use(httpLogger);

// Probes + scrape (raw, outside /api → no envelope/auth/rate-limit)
app.use('/', observabilityRoutes);
app.get('/openapi.json', (_req, res) => res.json(buildOpenApi()));

// Queue monitoring (token-gated; disabled unless ENABLE_QUEUE_DASHBOARD=true)
const queueDashboard = buildQueueDashboard();
if (queueDashboard) app.use('/', queueDashboard);

// Global rate limit
app.use('/api', apiLimiter);

// Standard response envelope for the whole /api surface
app.use('/api', envelope);

// Routes
app.use('/api/auth',        authRoutes);
app.use('/api/branding',    brandingRoutes);
app.use('/api/comments',    commentRoutes);
app.use('/api/activity',    activityRoutes);
app.use('/api/search',      searchRoutes);
app.use('/api/ai',          aiRoutes);
app.use('/api/exports',     exportRoutes);
app.use('/api/billing',     billingRoutes);
app.use('/api',             hierarchyRoutes);
app.use('/api/daily-log',   dailyLogRoutes);
app.use('/api/onboarding',  onboardingRoutes);
app.use('/api/work-items',  workItemRoutes);
app.use('/api/follow-ups',  followUpRoutes);
app.use('/api/time-logs',   timeLogRoutes);
app.use('/api/meetings',    meetingRoutes);
app.use('/api/ideas',         ideaRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/manager',       managerRoutes);
app.use('/api/signals',       signalsRoutes);
app.use('/api/leadership',       leadershipRoutes);
app.use('/api/kb',               kbRoutes);
app.use('/api/announcements',    announcementRoutes);
app.use('/api/admin',            adminRoutes);
app.use('/api/reports',          reportsRoutes);
app.use('/api/invisible-effort', invisibleEffortRoutes);

// 404 — standardized envelope
app.use((_req, res) => fail(res, 404, 'NOT_FOUND', 'Not found'));

// Central error handler — { success, data, meta, error }
app.use(errorHandler);

export default app;
