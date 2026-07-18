import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all diesel log entries
// @route   GET /api/diesel
// @access  Private
export const getDieselEntries = async (req, res, next) => {
  const { busId, startDate, endDate } = req.query;
  try {
    let sql = `
      SELECT de.*, b.number AS busNumber
      FROM diesel_entries de
      INNER JOIN buses b ON de.bus_id = b.id
      WHERE b.status = 1
    `;
    const params = [];

    if (busId) {
      sql += ' AND de.bus_id = ?';
      params.push(busId);
    }
    if (startDate && endDate) {
      sql += ' AND de.date BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    sql += ' ORDER BY de.date DESC, de.id DESC';

    const [rows] = await pool.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new diesel entry
// @route   POST /api/diesel
// @access  Private/OfficeStaff/Admin
export const createDieselEntry = async (req, res, next) => {
  const { date, busId, litres, amount, odometer } = req.body;

  if (!date || !busId || litres === undefined || amount === undefined || odometer === undefined) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Validate bus exists
    const [bus] = await pool.query('SELECT number FROM buses WHERE id = ? AND status = 1', [busId]);
    if (bus.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid Bus ID' });
    }

    const sql = `
      INSERT INTO diesel_entries (date, bus_id, litres, amount, odometer)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [date, busId, litres, amount, odometer]);

    const newEntryId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newValues = {
      id: newEntryId,
      date,
      busId,
      busNumber: bus[0].number,
      litres,
      amount,
      odometer
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'diesel_entries',
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

// @desc    Delete diesel entry
// @route   DELETE /api/diesel/:id
// @access  Private/Admin
export const deleteDieselEntry = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM diesel_entries WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Diesel log not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('DELETE FROM diesel_entries WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'diesel_entries',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Diesel log deleted successfully' });
  } catch (error) {
    next(error);
  }
};
