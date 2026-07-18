import express from 'express';
import {
  getBuses,
  getBusById,
  createBus,
  updateBus,
  deleteBus,
  renewBusDocument
} from '../controllers/busController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getBuses)
  .post(authorizeRoles('admin', 'officeStaff'), createBus);

router.route('/:id')
  .get(getBusById)
  .put(authorizeRoles('admin', 'officeStaff'), updateBus)
  .delete(authorizeRoles('admin'), deleteBus);

router.put('/:id/renew', authorizeRoles('admin', 'officeStaff'), renewBusDocument);

export default router;
