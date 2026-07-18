import express from 'express';
import { getAuditLogs } from '../controllers/auditController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.use(protect);
router.use(authorizeRoles('admin', 'officeStaff'));

router.get('/', getAuditLogs);

export default router;
