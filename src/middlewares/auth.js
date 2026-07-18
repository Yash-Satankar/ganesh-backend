import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token missing.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_ganesh_transport_2026');

    // Fetch user from DB
    const [rows] = await pool.query(
      'SELECT id, name, email, mobile, role, status FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    const user = rows[0];

    // Check if user is active
    if (user.status !== 1) {
      return res.status(403).json({
        success: false,
        message: 'This user account is inactive/suspended.'
      });
    }

    // Attach user to req object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth verification error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route, token invalid.'
    });
  }
};

// Check role permissions
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({
        success: false,
        message: 'User authentication object missing in request context.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this action.`
      });
    }

    next();
  };
};
