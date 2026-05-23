import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listTimeLogs, createTimeLog, stopTimer,
  updateTimeLog, deleteTimeLog, getRunningTimer,
} from '../controllers/timeLogController';

const router = Router();
router.use(authenticate);

router.get('/running', getRunningTimer);
router.get('/',        listTimeLogs);
router.post('/',       createTimeLog);
router.post('/:id/stop', stopTimer);
router.patch('/:id',   updateTimeLog);
router.delete('/:id',  deleteTimeLog);

export default router;
