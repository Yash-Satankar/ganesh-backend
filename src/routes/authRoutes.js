import express from 'express';
import { login, register, getProfile } from '../controllers/authController.js';
import { protect, authorizeRoles } from '../middlewares/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, authorizeRoles('admin'), register);
router.get('/profile', protect, getProfile);

export default router;
