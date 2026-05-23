import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listMeetings, createMeeting, updateMeeting,
  deleteMeeting, getMeetingStats,
} from '../controllers/meetingController';

const router = Router();
router.use(authenticate);

router.get('/stats', getMeetingStats);
router.get('/',      listMeetings);
router.post('/',     createMeeting);
router.patch('/:id', updateMeeting);
router.delete('/:id', deleteMeeting);

export default router;
