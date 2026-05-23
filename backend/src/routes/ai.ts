import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../core/http';
import { requirePlan } from '../core/billing/plan';
import { standupDigest, blockerTriage } from '../controllers/aiController';

const router = Router();
router.use(authenticate);
router.use(requirePlan('PRO')); // AI is a PRO+ feature (plan-gated)

router.post('/standup-digest', asyncHandler(standupDigest));
router.post('/blocker-triage', requireRole(['MANAGER', 'LEADERSHIP', 'ADMIN']), asyncHandler(blockerTriage));

export default router;
