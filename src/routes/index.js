import express from 'express';
import authRoutes from './authRoutes.js';
import busRoutes from './busRoutes.js';
import driverRoutes from './driverRoutes.js';
import companyRoutes from './companyRoutes.js';
import shiftRouteRoutes from './shiftRouteRoutes.js';
import attendanceRoutes from './attendanceRoutes.js';
import tripRoutes from './tripRoutes.js';
import dieselRoutes from './dieselRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import auditRoutes from './auditRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/buses', busRoutes);
router.use('/drivers', driverRoutes);
router.use('/companies', companyRoutes);
router.use('/routes', shiftRouteRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/trips', tripRoutes);
router.use('/diesel', dieselRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/history', auditRoutes);

export default router;
