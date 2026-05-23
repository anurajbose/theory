import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import {
  listWorkItems, createWorkItem, updateWorkItem,
  moveWorkItem, deleteWorkItem, listSections,
  listQuery, idParam, createBody, updateBody, moveBody,
} from '../controllers/workItemController';

const router = Router();
router.use(authenticate);

router.get('/sections', asyncHandler(listSections));
router.get('/', validate({ query: listQuery }), asyncHandler(listWorkItems));
router.post('/', validate({ body: createBody }), asyncHandler(createWorkItem));
router.patch('/:id', validate({ params: idParam, body: updateBody }), asyncHandler(updateWorkItem));
router.patch('/:id/move', validate({ params: idParam, body: moveBody }), asyncHandler(moveWorkItem));
router.delete('/:id', validate({ params: idParam }), asyncHandler(deleteWorkItem));

export default router;
