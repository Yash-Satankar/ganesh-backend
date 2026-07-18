import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all trips (optional filter by company, driver, date)
// @route   GET /api/trips
// @access  Private
export const getTrips = async (req, res, next) => {
  const { date, companyId, driverId } = req.query;
  try {
    let sql = `
      SELECT t.*, c.name AS company, sr.shift_name AS shift, sr.route_name AS route, b.number AS busNumber, d.name AS driverName
      FROM trips t
      INNER JOIN companies c ON t.company_id = c.id
      INNER JOIN shift_routes sr ON t.shift_route_id = sr.id
      INNER JOIN buses b ON t.bus_id = b.id
      INNER JOIN drivers d ON t.driver_id = d.id
    `;
    const params = [];
    const conditions = [];

    if (date) {
      conditions.push('DATE(t.date) = ?');
      params.push(date);
    }
    if (companyId) {
      conditions.push('t.company_id = ?');
      params.push(companyId);
    }
    if (driverId) {
      conditions.push('t.driver_id = ?');
      params.push(driverId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY t.date DESC, t.id DESC';

    const [rows] = await pool.query(sql, params);
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new trip entry
// @route   POST /api/trips
// @access  Private/OfficeStaff/Admin
export const createTrip = async (req, res, next) => {
  const { date, companyId, shiftRouteId, busId, driverId, kilometers, amount, startTime, endTime } = req.body;

  if (!date || !companyId || !shiftRouteId || !busId || !driverId || kilometers === undefined || amount === undefined) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    // Validate relations
    const [company] = await pool.query('SELECT name FROM companies WHERE id = ? AND status = 1', [companyId]);
    const [route] = await pool.query('SELECT shift_name, route_name FROM shift_routes WHERE id = ? AND status = 1', [shiftRouteId]);
    const [bus] = await pool.query('SELECT number FROM buses WHERE id = ? AND status = 1', [busId]);
    const [driver] = await pool.query('SELECT name FROM drivers WHERE id = ? AND status = 1', [driverId]);

    if (company.length === 0 || route.length === 0 || bus.length === 0 || driver.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid relationship references' });
    }

    const sql = `
      INSERT INTO trips (date, company_id, shift_route_id, bus_id, driver_id, kilometers, amount, start_time, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [date, companyId, shiftRouteId, busId, driverId, kilometers, amount, startTime || null, endTime || null]);

    const newTripId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newValues = {
      id: newTripId,
      date,
      companyId,
      company: company[0].name,
      shiftRouteId,
      shift: route[0].shift_name,
      route: route[0].route_name,
      busId,
      busNumber: bus[0].number,
      driverId,
      driverName: driver[0].name,
      kilometers,
      amount,
      startTime,
      endTime
    };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'trips',
      entityId: newTripId,
      oldValues: null,
      newValues,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newValues });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete trip entry
// @route   DELETE /api/trips/:id
// @access  Private/Admin
export const deleteTrip = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM trips WHERE id = ?', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip log not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('DELETE FROM trips WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'trips',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Trip log deleted successfully' });
  } catch (error) {
    next(error);
  }
};
