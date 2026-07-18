import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all active buses with assigned driver name
// @route   GET /api/buses
// @access  Private
export const getBuses = async (req, res, next) => {
  try {
    const query = `
      SELECT b.*, COALESCE(d.name, 'Not Assigned') AS driverName
      FROM buses b
      LEFT JOIN drivers d ON d.assigned_bus_id = b.id AND d.status = 1
      WHERE b.status = 1
    `;
    const [rows] = await pool.query(query);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single bus details
// @route   GET /api/buses/:id
// @access  Private
export const getBusById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT b.*, COALESCE(d.name, 'Not Assigned') AS driverName
      FROM buses b
      LEFT JOIN drivers d ON d.assigned_bus_id = b.id AND d.status = 1
      WHERE b.id = ? AND b.status = 1
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new bus
// @route   POST /api/buses
// @access  Private/OfficeStaff/Admin
export const createBus = async (req, res, next) => {
  const { number, model, capacity, insuranceExpiry, fitnessExpiry, permitExpiry, pucExpiry } = req.body;

  if (!number || !model || !capacity || !insuranceExpiry || !fitnessExpiry || !permitExpiry || !pucExpiry) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Check if number already exists
    const [existing] = await pool.query('SELECT id FROM buses WHERE number = ?', [number]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Bus number already exists' });
    }

    const sql = `
      INSERT INTO buses (number, model, capacity, insurance_expiry, fitness_expiry, permit_expiry, puc_expiry)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [
      number,
      model,
      capacity,
      insuranceExpiry,
      fitnessExpiry,
      permitExpiry,
      pucExpiry
    ]);

    const newBusId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newBusData = { id: newBusId, number, model, capacity, insuranceExpiry, fitnessExpiry, permitExpiry, pucExpiry };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'buses',
      entityId: newBusId,
      oldValues: null,
      newValues: newBusData,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newBusData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bus details
// @route   PUT /api/buses/:id
// @access  Private/OfficeStaff/Admin
export const updateBus = async (req, res, next) => {
  const { id } = req.params;
  const { number, model, capacity, insuranceExpiry, fitnessExpiry, permitExpiry, pucExpiry } = req.body;

  try {
    // Get old values
    const [oldRows] = await pool.query('SELECT * FROM buses WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    const oldValues = oldRows[0];

    const sql = `
      UPDATE buses 
      SET number = ?, model = ?, capacity = ?, insurance_expiry = ?, fitness_expiry = ?, permit_expiry = ?, puc_expiry = ?
      WHERE id = ?
    `;
    await pool.query(sql, [
      number || oldValues.number,
      model || oldValues.model,
      capacity || oldValues.capacity,
      insuranceExpiry || oldValues.insurance_expiry,
      fitnessExpiry || oldValues.fitness_expiry,
      permitExpiry || oldValues.permit_expiry,
      pucExpiry || oldValues.puc_expiry,
      id
    ]);

    // Get new values
    const [newRows] = await pool.query('SELECT * FROM buses WHERE id = ?', [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'buses',
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

// @desc    Soft delete bus
// @route   DELETE /api/buses/:id
// @access  Private/Admin
export const deleteBus = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM buses WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found or already deleted' });
    }
    const oldValues = oldRows[0];

    await pool.query('UPDATE buses SET status = 0 WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'buses',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Bus soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Renew bus document expiry date
// @route   PUT /api/buses/:id/renew
// @access  Private/OfficeStaff/Admin
export const renewBusDocument = async (req, res, next) => {
  const { id } = req.params;
  const { docType, newExpiry } = req.body; // docType can be: Insurance, Fitness, Permit, PUC

  if (!docType || !newExpiry) {
    return res.status(400).json({ success: false, message: 'Document type and new expiry date are required' });
  }

  let dbField;
  switch (docType) {
    case 'Insurance':
      dbField = 'insurance_expiry';
      break;
    case 'Fitness':
      dbField = 'fitness_expiry';
      break;
    case 'Permit':
      dbField = 'permit_expiry';
      break;
    case 'PUC':
      dbField = 'puc_expiry';
      break;
    default:
      return res.status(400).json({ success: false, message: 'Invalid document type specified' });
  }

  try {
    const [oldRows] = await pool.query('SELECT * FROM buses WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }
    const oldValues = oldRows[0];

    await pool.query(`UPDATE buses SET ${dbField} = ? WHERE id = ?`, [newExpiry, id]);

    const [newRows] = await pool.query('SELECT * FROM buses WHERE id = ?', [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'buses',
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
