import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { completeOnboarding } from '../controllers/onboardingController';

const router = Router();
router.use(authenticate);
router.post('/complete', completeOnboarding);
export default router;
