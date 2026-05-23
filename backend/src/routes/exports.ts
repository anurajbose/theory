import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../core/validate';
import { asyncHandler } from '../core/http';
import {
  createExport, listExports, getExport, downloadExport,
  createBody, listQuery, idParam, downloadQuery,
} from '../controllers/exportController';

const router = Router();
router.use(authenticate);

router.post('/', validate({ body: createBody }), asyncHandler(createExport));
router.get('/', validate({ query: listQuery }), asyncHandler(listExports));
router.get('/:id', validate({ params: idParam }), asyncHandler(getExport));
router.get('/:id/download', validate({ params: idParam, query: downloadQuery }), asyncHandler(downloadExport));

export default router;
