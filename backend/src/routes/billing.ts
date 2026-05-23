import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../core/http';
import {
  getSubscription, billingWebhook, getEntitlements, upgradePlan,
} from '../controllers/billingController';

const router = Router();

// Public, HMAC-verified webhook (no session — provider → us).
router.post('/webhook/:provider', asyncHandler(billingWebhook));

// Authenticated, tenant-scoped.
router.get('/subscription',  authenticate, asyncHandler(getSubscription));
router.get('/entitlements',  authenticate, asyncHandler(getEntitlements));
router.post('/upgrade',      authenticate, asyncHandler(upgradePlan));

export default router;
