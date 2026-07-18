import express from 'express';
import {
  getAttendance,
  createAttendance,
  updateAttendanceStatus,
  deleteAttendance
} from '../controllers/attendanceController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getAttendance)
  .post(authorizeRoles('admin', 'officeStaff'), createAttendance);

router.route('/:id')
  .put(authorizeRoles('admin', 'officeStaff'), updateAttendanceStatus)
  .delete(authorizeRoles('admin'), deleteAttendance);

export default router;
