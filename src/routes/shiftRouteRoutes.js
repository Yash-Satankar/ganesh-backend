import express from 'express';
import {
  getShiftRoutes,
  createShiftRoute,
  updateShiftRoute,
  deleteShiftRoute
} from '../controllers/shiftRouteController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getShiftRoutes)
  .post(authorizeRoles('admin', 'officeStaff'), createShiftRoute);

router.route('/:id')
  .put(authorizeRoles('admin', 'officeStaff'), updateShiftRoute)
  .delete(authorizeRoles('admin'), deleteShiftRoute);

export default router;
