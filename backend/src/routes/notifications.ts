import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import {
  listNotifications, markRead, markAllRead, deleteNotification,
  listQuerySchema, idParamSchema,
} from '../controllers/notificationController';

const router = Router();
router.use(authenticate);

router.get('/', validate({ query: listQuerySchema }), asyncHandler(listNotifications));
router.patch('/read-all', asyncHandler(markAllRead));
router.patch('/:id/read', validate({ params: idParamSchema }), asyncHandler(markRead));
router.delete('/:id', validate({ params: idParamSchema }), asyncHandler(deleteNotification));

export default router;
