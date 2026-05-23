import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getTodayLog,
  getLogByDate,
  upsertLog,
  saveJournal,
  getMoodAggregate,
  generateStandup,
  eodStatus,
} from '../controllers/dailyLogController';

const router = Router();

router.use(authenticate);

router.get('/today', getTodayLog);
router.post('/today', upsertLog);
router.patch('/today', upsertLog);

// Journal — write-only, no GET
router.post('/today/journal', saveJournal);

router.get('/eod-status', eodStatus);
router.get('/standup', generateStandup);
router.get('/mood-aggregate', getMoodAggregate);

// Historical read (no journal)
router.get('/:date', getLogByDate);

export default router;
