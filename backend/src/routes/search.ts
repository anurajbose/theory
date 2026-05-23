import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import { doSearch, searchQuery } from '../controllers/searchController';

const router = Router();
router.use(authenticate);
router.get('/', validate({ query: searchQuery }), asyncHandler(doSearch));

export default router;
