import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import {
  listFollowUps, createFollowUp, updateFollowUp,
  deleteFollowUp, closeFollowUp,
  listQuery, idParam, createBody, updateBody,
} from '../controllers/followUpController';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), asyncHandler(listFollowUps));
router.post('/', validate({ body: createBody }), asyncHandler(createFollowUp));
router.patch('/:id', validate({ params: idParam, body: updateBody }), asyncHandler(updateFollowUp));
router.post('/:id/close', validate({ params: idParam }), asyncHandler(closeFollowUp));
router.delete('/:id', validate({ params: idParam }), asyncHandler(deleteFollowUp));

export default router;
