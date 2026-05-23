import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../core/http';
import {
  orgOverview, orgTeamSignals, orgBlockers, orgCompliance, orgWorkBreakdown,
} from '../controllers/leadershipController';

const router = Router();
router.use(authenticate);
router.use(requireRole(['LEADERSHIP', 'ADMIN']));

router.get('/overview',       asyncHandler(orgOverview));
router.get('/team-signals',   asyncHandler(orgTeamSignals));
router.get('/blockers',       asyncHandler(orgBlockers));
router.get('/compliance',     asyncHandler(orgCompliance));
router.get('/work-breakdown', asyncHandler(orgWorkBreakdown));

export default router;
