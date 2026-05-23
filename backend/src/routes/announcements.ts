import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listAnnouncements, createAnnouncement, acknowledgeAnnouncement, deleteAnnouncement } from '../controllers/announcementController';

const router = Router();

router.use(authenticate);

router.get('/', listAnnouncements);
router.post('/', requireRole(['MANAGER', 'ADMIN', 'LEADERSHIP']), createAnnouncement);
router.patch('/:id/ack', acknowledgeAnnouncement);
router.delete('/:id', deleteAnnouncement);

export default router;
