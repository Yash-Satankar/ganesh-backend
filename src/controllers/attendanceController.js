import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get attendance records (optional filter by date)
// @route   GET /api/attendance
// @access  Private
export const getAttendance = async (req, res, next) => {
  const { date } = req.query; // Expect yyyy-mm-dd
  try {
    let sql = `
      SELECT a.*, d.name AS driverName, b.number AS busNumber, sr.shift_name AS shift
      FROM attendance a
      INNER JOIN drivers d ON a.driver_id = d.id
      INNER JOIN buses b ON a.bus_id = b.id
      INNER JOIN shift_routes sr ON a.shift_route_id = sr.id
    `;
    const params = [];

    if (date) {
      sql += ' WHERE DATE(a.call_time) = ?';
      params.push(date);
    }

    sql += ' ORDER BY a.call_time DESC';

    const [rows] = await pool.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new attendance record
// @route   POST /api/attendance
// @access  Private/OfficeStaff/Admin
export const createAttendance = async (req, res, next) => {
  const { driverId, busId, shiftRouteId, callTime, status } = req.body;

  if (!driverId || !busId || !shiftRouteId || !callTime || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Validate driver, bus, route exist
    const [driver] = await pool.query('SELECT name FROM drivers WHERE id = ? AND status = 1', [driverId]);
    const [bus] = await pool.query('SELECT number FROM buses WHERE id = ? AND status = 1', [busId]);
    const [route] = await pool.query('SELECT shift_name FROM shift_routes WHERE id = ? AND status = 1', [shiftRouteId]);

    if (driver.length === 0 || bus.length === 0 || route.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid Driver ID, Bus ID or Shift Route ID' });
    }

    const sql = `
      INSERT INTO attendance (driver_id, bus_id, shift_route_id, call_time, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [driverId, busId, shiftRouteId, callTime, status]);

    const newAttendanceId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newValues = {
      id: newAttendanceId,
      driverId,
      driverName: driver[0].name,
      busId,
      busNumber: bus[0].number,
      shiftRouteId,
      shift: route[0].shift_name,
      callTime,
      status
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'attendance',
      entityId: newAttendanceId,
      oldValues: null,
      newValues,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newValues });
  } catch (error) {
    next(error);
  }
};

// @desc    Update attendance status
// @route   PUT /api/attendance/:id
// @access  Private/OfficeStaff/Admin
export const updateAttendanceStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  const validStatuses = ['Present', 'Late', 'Absent'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status value' });
  }

  try {
    const [oldRows] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('UPDATE attendance SET status = ? WHERE id = ?', [status, id]);

    // Fetch updated with full info
    const query = `
      SELECT a.*, d.name AS driverName, b.number AS busNumber, sr.shift_name AS shift
      FROM attendance a
      INNER JOIN drivers d ON a.driver_id = d.id
      INNER JOIN buses b ON a.bus_id = b.id
      INNER JOIN shift_routes sr ON a.shift_route_id = sr.id
      WHERE a.id = ?
    `;
    const [newRows] = await pool.query(query, [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'attendance',
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

// @desc    Delete attendance record
// @route   DELETE /api/attendance/:id
// @access  Private/Admin
export const deleteAttendance = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM attendance WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('DELETE FROM attendance WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'attendance',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    next(error);
  }
};
