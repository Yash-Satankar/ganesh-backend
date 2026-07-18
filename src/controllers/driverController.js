import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all active drivers with assigned bus numbers
// @route   GET /api/drivers
// @access  Private
export const getDrivers = async (req, res, next) => {
  try {
    const query = `
      SELECT d.*, COALESCE(b.number, 'Not Assigned') AS assignedBus
      FROM drivers d
      LEFT JOIN buses b ON d.assigned_bus_id = b.id AND b.status = 1
      WHERE d.status = 1
    `;
    const [rows] = await pool.query(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single driver details
// @route   GET /api/drivers/:id
// @access  Private
export const getDriverById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT d.*, COALESCE(b.number, 'Not Assigned') AS assignedBus
      FROM drivers d
      LEFT JOIN buses b ON d.assigned_bus_id = b.id AND b.status = 1
      WHERE d.id = ? AND d.status = 1
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new driver
// @route   POST /api/drivers
// @access  Private/OfficeStaff/Admin
export const createDriver = async (req, res, next) => {
  const { name, mobile, licenseNumber, licenseExpiry, assignedBusId, monthlySalary } = req.body;

  if (!name || !mobile || !licenseNumber || !licenseExpiry || !monthlySalary) {
    return res.status(400).json({ success: false, message: 'Required fields are missing' });
  }

  try {
    // Check if mobile or license number already exists
    const [existing] = await pool.query('SELECT id FROM drivers WHERE mobile = ? OR license_number = ?', [mobile, licenseNumber]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Mobile number or License number already registered' });
    }

    const sql = `
      INSERT INTO drivers (name, mobile, license_number, license_expiry, assigned_bus_id, monthly_salary)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      name,
      mobile,
      licenseNumber,
      licenseExpiry,
      assignedBusId || null,
      monthlySalary
    ]);

    const newDriverId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newDriverData = {
      id: newDriverId,
      name,
      mobile,
      licenseNumber,
      licenseExpiry,
      assignedBusId: assignedBusId || null,
      monthlySalary
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'drivers',
      entityId: newDriverId,
      oldValues: null,
      newValues: newDriverData,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newDriverData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update driver details
// @route   PUT /api/drivers/:id
// @access  Private/OfficeStaff/Admin
export const updateDriver = async (req, res, next) => {
  const { id } = req.params;
  const { name, mobile, licenseNumber, licenseExpiry, assignedBusId, monthlySalary } = req.body;

  try {
    const [oldRows] = await pool.query('SELECT * FROM drivers WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    const oldValues = oldRows[0];

    const sql = `
      UPDATE drivers 
      SET name = ?, mobile = ?, license_number = ?, license_expiry = ?, assigned_bus_id = ?, monthly_salary = ?
      WHERE id = ?
    `;
    await pool.query(sql, [
      name || oldValues.name,
      mobile || oldValues.mobile,
      licenseNumber || oldValues.license_number,
      licenseExpiry || oldValues.license_expiry,
      assignedBusId !== undefined ? assignedBusId : oldValues.assigned_bus_id,
      monthlySalary || oldValues.monthly_salary,
      id
    ]);

    const [newRows] = await pool.query('SELECT * FROM drivers WHERE id = ?', [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'drivers',
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

// @desc    Soft delete driver
// @route   DELETE /api/drivers/:id
// @access  Private/Admin
export const deleteDriver = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM drivers WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('UPDATE drivers SET status = 0 WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'drivers',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Driver soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};
