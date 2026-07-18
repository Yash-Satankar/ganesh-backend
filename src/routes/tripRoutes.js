import express from 'express';
import {
  getTrips,
  createTrip,
  deleteTrip
} from '../controllers/tripController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getTrips)
  .post(authorizeRoles('admin', 'officeStaff'), createTrip);

router.route('/:id')
  .delete(authorizeRoles('admin'), deleteTrip);

export default router;
