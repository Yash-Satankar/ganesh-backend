import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// Helper to generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'super_secret_jwt_key_ganesh_transport_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  const { loginIdentifier, password } = req.body; // loginIdentifier can be email or mobile

  if (!loginIdentifier || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both mobile/email and password'
    });
  }

  try {
    // Check for user
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR mobile = ?',
      [loginIdentifier, loginIdentifier]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = rows[0];

    // Check if account is active
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently deactivated.'
      });
    }

    // Compare password hash
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Private/Admin
export const register = async (req, res, next) => {
  const { name, email, mobile, password, role } = req.body;

  if (!name || !mobile || !password || !role) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, mobile, password and role'
    });
  }

  const validRoles = ['admin', 'officeStaff', 'driver'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user role specified'
    });
  }

  try {
    // Check if mobile or email already exists
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE mobile = ? OR (email IS NOT NULL AND email = ?)',
      [mobile, email || '']
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'A user with this mobile number or email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email || null, mobile, passwordHash, role]
    );

    const newUserId = result.insertId;

    // Log action to audit logs
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user ? req.user.id : null,
      action: 'CREATE',
      entityType: 'users',
      entityId: newUserId,
      oldValues: null,
      newValues: { id: newUserId, name, email, mobile, role },
      ipAddress: clientIp
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUserId,
        name,
        email,
        mobile,
        role
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user
    });
  } catch (error) {
    next(error);
  }
};
