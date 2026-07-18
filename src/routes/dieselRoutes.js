import express from 'express';
import {
  getDieselEntries,
  createDieselEntry,
  deleteDieselEntry
} from '../controllers/dieselController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(getDieselEntries)
  .post(authorizeRoles('admin', 'officeStaff'), createDieselEntry);

router.route('/:id')
  .delete(authorizeRoles('admin'), deleteDieselEntry);

export default router;
