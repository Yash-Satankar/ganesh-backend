import express from 'express';
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany
} from '../controllers/companyController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getCompanies)
  .post(authorizeRoles('admin', 'officeStaff'), createCompany);

router.route('/:id')
  .get(getCompanyById)
  .put(authorizeRoles('admin', 'officeStaff'), updateCompany)
  .delete(authorizeRoles('admin'), deleteCompany);

export default router;
