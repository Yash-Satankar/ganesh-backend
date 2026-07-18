import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all maintenance logs
// @route   GET /api/maintenance
// @access  Private
export const getMaintenanceEntries = async (req, res, next) => {
  const { busId } = req.query;
  try {
    let sql = `
      SELECT me.*, b.number AS busNumber
      FROM maintenance_entries me
      INNER JOIN buses b ON me.bus_id = b.id
      WHERE b.status = 1
    `;
    const params = [];

    if (busId) {
      sql += ' AND me.bus_id = ?';
      params.push(busId);
    }

    sql += ' ORDER BY me.date DESC, me.id DESC';

    const [rows] = await pool.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new maintenance entry
// @route   POST /api/maintenance
// @access  Private/OfficeStaff/Admin
export const createMaintenanceEntry = async (req, res, next) => {
  const { date, busId, workType, description, cost } = req.body;

  if (!date || !busId || !workType || cost === undefined) {
    return res.status(400).json({ success: false, message: 'Required fields are missing' });
  }

  try {
    // Validate bus exists
    const [bus] = await pool.query('SELECT number FROM buses WHERE id = ? AND status = 1', [busId]);
    if (bus.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid Bus ID' });
    }

    const sql = `
      INSERT INTO maintenance_entries (date, bus_id, work_type, description, cost)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [date, busId, workType, description || null, cost]);

    const newEntryId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newValues = {
      id: newEntryId,
      date,
      busId,
      busNumber: bus[0].number,
      workType,
      description: description || '',
      cost
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'maintenance_entries',
      entityId: newEntryId,
      oldValues: null,
      newValues: newValues,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newValues });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete maintenance entry
// @route   DELETE /api/maintenance/:id
// @access  Private/Admin
export const deleteMaintenanceEntry = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM maintenance_entries WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Maintenance log not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('DELETE FROM maintenance_entries WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'maintenance_entries',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Maintenance log deleted successfully' });
  } catch (error) {
    next(error);
  }
};
