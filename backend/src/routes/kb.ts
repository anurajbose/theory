import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { listKB, getKBArticle, createKB, updateKB, deleteKB, togglePin } from '../controllers/kbController';

const router = Router();

router.use(authenticate);

router.get('/', listKB);
router.get('/:id', getKBArticle);
router.post('/', createKB);
router.put('/:id', updateKB);
router.delete('/:id', deleteKB);
router.patch('/:id/pin', togglePin);

export default router;
