import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../core/http';
import {
  managerOverview, managerWorkItems, managerBlockers,
  managerFollowUps, managerTimeSummary, managerMeetings,
  managerTeamSignals, managerActivity,
} from '../controllers/managerController';

const router = Router();
router.use(authenticate);
router.use(requireRole(['MANAGER', 'ADMIN', 'LEADERSHIP']));

router.get('/overview',     asyncHandler(managerOverview));
router.get('/work-items',   asyncHandler(managerWorkItems));
router.get('/blockers',     asyncHandler(managerBlockers));
router.get('/follow-ups',   asyncHandler(managerFollowUps));
router.get('/time-summary', asyncHandler(managerTimeSummary));
router.get('/meetings',     asyncHandler(managerMeetings));
router.get('/team-signals', asyncHandler(managerTeamSignals));
router.get('/activity',     asyncHandler(managerActivity));

export default router;
