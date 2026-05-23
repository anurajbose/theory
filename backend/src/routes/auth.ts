import { Router } from 'express';
import {
  register, registerSchema,
  login, refresh, logout, me,
  forgotPassword, resetPassword, forgotSchema, resetSchema,
} from '../controllers/authController';
import { googleAuth } from '../controllers/googleAuthController';
import {
  mfaSetup, mfaEnable, mfaDisable, mfaLogin,
  codeSchema, mfaLoginSchema,
} from '../controllers/mfaController';
import {
  listSessions, revokeSession, revokeAllSessions, sessionIdParam,
} from '../controllers/sessionController';
import { authenticate } from '../middleware/auth';
import { authLimiter, loginLimiter } from '../middleware/rateLimit';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';

const router = Router();

// ── Public ──
router.post('/register', authLimiter, validate({ body: registerSchema }), asyncHandler(register));
router.post('/login', loginLimiter, authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.post('/mfa/login', authLimiter, validate({ body: mfaLoginSchema }), asyncHandler(mfaLogin));
router.post('/forgot-password', authLimiter, validate({ body: forgotSchema }), asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, validate({ body: resetSchema }), asyncHandler(resetPassword));

// ── Authenticated ──
router.get('/me', authenticate, me);

router.post('/mfa/setup', authenticate, asyncHandler(mfaSetup));
router.post('/mfa/enable', authenticate, validate({ body: codeSchema }), asyncHandler(mfaEnable));
router.post('/mfa/disable', authenticate, validate({ body: codeSchema }), asyncHandler(mfaDisable));

router.get('/sessions', authenticate, asyncHandler(listSessions));
router.delete('/sessions/:id', authenticate, validate({ params: sessionIdParam }), asyncHandler(revokeSession));
router.post('/sessions/revoke-all', authenticate, asyncHandler(revokeAllSessions));

export default router;
