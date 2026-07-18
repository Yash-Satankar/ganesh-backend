import express from 'express';
import {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver
} from '../controllers/driverController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDrivers)
  .post(authorizeRoles('admin', 'officeStaff'), createDriver);

router.route('/:id')
  .get(getDriverById)
  .put(authorizeRoles('admin', 'officeStaff'), updateDriver)
  .delete(authorizeRoles('admin'), deleteDriver);

export default router;
