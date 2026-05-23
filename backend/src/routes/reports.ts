import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { personalWeeklyReport, teamWeeklyReport, exportPersonalCSV } from '../controllers/reportsController';

const router = Router();

router.use(authenticate);

router.get('/personal', personalWeeklyReport);
router.get('/team', requireRole(['MANAGER', 'ADMIN', 'LEADERSHIP']), teamWeeklyReport);
router.get('/export', exportPersonalCSV);

export default router;
