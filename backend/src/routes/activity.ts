import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import { listActivity, listQuery } from '../controllers/activityController';

const router = Router();
router.use(authenticate);
router.get('/', validate({ query: listQuery }), asyncHandler(listActivity));

export default router;
