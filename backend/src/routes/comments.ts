import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import {
  listComments, createComment, editComment, deleteComment,
  listQuery, createBody, idParam, editBody,
} from '../controllers/commentController';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuery }), asyncHandler(listComments));
router.post('/', validate({ body: createBody }), asyncHandler(createComment));
router.patch('/:id', validate({ params: idParam, body: editBody }), asyncHandler(editComment));
router.delete('/:id', validate({ params: idParam }), asyncHandler(deleteComment));

export default router;
