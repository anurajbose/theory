import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listUsers, updateUser, listAuditLogs, getAdminStats, listTeams } from '../controllers/adminController';

const router = Router();

router.use(authenticate, requireRole(['ADMIN']));

router.get('/stats', getAdminStats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.get('/teams', listTeams);
router.get('/audit-logs', listAuditLogs);

export default router;
