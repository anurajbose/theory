import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole, requireMinRole } from '../middleware/roleGuard';
import {
  getCompanies, createCompany, updateCompany,
  getBusinessUnits, createBusinessUnit, updateBusinessUnit, deleteBusinessUnit,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getTeams, getTeamById, createTeam, updateTeam, deleteTeam,
  getOrgTree,
} from '../controllers/hierarchyController';

const router = Router();

// All hierarchy routes require authentication
router.use(authenticate);

// Org tree — managers+ can view
router.get('/org-tree', requireMinRole('MANAGER'), getOrgTree);

// Companies — admin only write
router.get('/companies', requireMinRole('LEADERSHIP'), getCompanies);
router.post('/companies', requireRole('ADMIN'), createCompany);
router.put('/companies/:id', requireRole('ADMIN'), updateCompany);

// Business Units
router.get('/business-units', requireMinRole('MANAGER'), getBusinessUnits);
router.post('/business-units', requireRole('ADMIN'), createBusinessUnit);
router.put('/business-units/:id', requireRole('ADMIN'), updateBusinessUnit);
router.delete('/business-units/:id', requireRole('ADMIN'), deleteBusinessUnit);

// Departments
router.get('/departments', requireMinRole('MANAGER'), getDepartments);
router.post('/departments', requireRole('ADMIN'), createDepartment);
router.put('/departments/:id', requireRole('ADMIN'), updateDepartment);
router.delete('/departments/:id', requireRole('ADMIN'), deleteDepartment);

// Teams — employees can GET their own team (filtered by middleware in controller)
router.get('/teams', authenticate, getTeams);
router.get('/teams/:id', authenticate, getTeamById);
router.post('/teams', requireRole('ADMIN'), createTeam);
router.put('/teams/:id', requireRole('ADMIN'), updateTeam);
router.delete('/teams/:id', requireRole('ADMIN'), deleteTeam);

export default router;
