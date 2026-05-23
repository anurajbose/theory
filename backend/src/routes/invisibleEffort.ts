import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { computeMyEffort, getMyEffortHistory, getTeamEffort } from '../controllers/invisibleEffortController';

const router = Router();

router.use(authenticate);

router.get('/history', getMyEffortHistory);
router.post('/compute', computeMyEffort);
router.get('/team', requireRole(['MANAGER', 'ADMIN', 'LEADERSHIP']), getTeamEffort);

export default router;
