import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all active shift routes with company names
// @route   GET /api/routes
// @access  Private
export const getShiftRoutes = async (req, res, next) => {
  try {
    const query = `
      SELECT sr.*, c.name AS companyName
      FROM shift_routes sr
      INNER JOIN companies c ON sr.company_id = c.id
      WHERE sr.status = 1 AND c.status = 1
    `;
    const [rows] = await pool.query(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new shift route
// @route   POST /api/routes
// @access  Private/OfficeStaff/Admin
export const createShiftRoute = async (req, res, next) => {
  const { companyId, shiftName, routeName, startTime, endTime } = req.body;

  if (!companyId || !shiftName || !routeName || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Validate if company exists
    const [company] = await pool.query('SELECT name FROM companies WHERE id = ? AND status = 1', [companyId]);
    if (company.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid Company ID' });
    }

    const sql = `
      INSERT INTO shift_routes (company_id, shift_name, route_name, start_time, end_time)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [companyId, shiftName, routeName, startTime, endTime]);

    const newRouteId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newRouteData = {
      id: newRouteId,
      companyId,
      companyName: company[0].name,
      shiftName,
      routeName,
      startTime,
      endTime
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'shift_routes',
      entityId: newRouteId,
      oldValues: null,
      newValues: newRouteData,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newRouteData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update shift route
// @route   PUT /api/routes/:id
// @access  Private/OfficeStaff/Admin
export const updateShiftRoute = async (req, res, next) => {
  const { id } = req.params;
  const { companyId, shiftName, routeName, startTime, endTime } = req.body;

  try {
    const [oldRows] = await pool.query('SELECT * FROM shift_routes WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shift route not found' });
    }
    const oldValues = oldRows[0];

    // If company changes, validate new company
    let targetCompanyId = companyId || oldValues.company_id;
    const [company] = await pool.query('SELECT name FROM companies WHERE id = ? AND status = 1', [targetCompanyId]);
    if (company.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid Company ID' });
    }

    const sql = `
      UPDATE shift_routes 
      SET company_id = ?, shift_name = ?, route_name = ?, start_time = ?, end_time = ?
      WHERE id = ?
    `;
    await pool.query(sql, [
      targetCompanyId,
      shiftName || oldValues.shift_name,
      routeName || oldValues.route_name,
      startTime || oldValues.start_time,
      endTime || oldValues.end_time,
      id
    ]);

    // Fetch updated row with company name
    const query = `
      SELECT sr.*, c.name AS companyName
      FROM shift_routes sr
      INNER JOIN companies c ON sr.company_id = c.id
      WHERE sr.id = ?
    `;
    const [newRows] = await pool.query(query, [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'shift_routes',
      entityId: id,
      oldValues,
      newValues,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, data: newValues });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete shift route
// @route   DELETE /api/routes/:id
// @access  Private/Admin
export const deleteShiftRoute = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM shift_routes WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shift route not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('UPDATE shift_routes SET status = 0 WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'shift_routes',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Shift route soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};
