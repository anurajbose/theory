import { Router } from 'express';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import { getBranding, brandingQuerySchema } from '../controllers/brandingController';

const router = Router();

// Public — no auth (login screen needs it before any token exists).
router.get('/', validate({ query: brandingQuerySchema }), asyncHandler(getBranding));

export default router;
