import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../core/http';
import {
  listSignals, transitionSignal, signalFeedback,
} from '../controllers/signalsController';

const router = Router();
router.use(authenticate);

router.get('/',                  asyncHandler(listSignals));
router.patch('/:id/state',       asyncHandler(transitionSignal));
router.post('/:id/feedback',     asyncHandler(signalFeedback));

export default router;
