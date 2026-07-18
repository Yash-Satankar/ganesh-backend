import express from 'express';
import {
  getMaintenanceEntries,
  createMaintenanceEntry,
  deleteMaintenanceEntry
} from '../controllers/maintenanceController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getMaintenanceEntries)
  .post(authorizeRoles('admin', 'officeStaff'), createMaintenanceEntry);

router.route('/:id')
  .delete(authorizeRoles('admin'), deleteMaintenanceEntry);

export default router;
