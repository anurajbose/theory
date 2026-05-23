import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  listIdeas, createIdea, updateIdea,
  deleteIdea, promoteIdea,
} from '../controllers/ideaController';

const router = Router();
router.use(authenticate);

router.get('/',             listIdeas);
router.post('/',            createIdea);
router.patch('/:id',        updateIdea);
router.post('/:id/promote', promoteIdea);
router.delete('/:id',       deleteIdea);

export default router;
