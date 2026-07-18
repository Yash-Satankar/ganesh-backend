import pool from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// @desc    Get all active companies
// @route   GET /api/companies
// @access  Private
export const getCompanies = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM companies WHERE status = 1');
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single company
// @route   GET /api/companies/:id
// @access  Private
export const getCompanyById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM companies WHERE id = ? AND status = 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new company
// @route   POST /api/companies
// @access  Private/OfficeStaff/Admin
export const createCompany = async (req, res, next) => {
  const { name, contactPerson, mobile, billingType, rate, email, gstNumber } = req.body;

  if (!name || !contactPerson || !mobile || !billingType || rate === undefined) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  try {
    const [existing] = await pool.query('SELECT id FROM companies WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Company name already exists' });
    }

    const sql = `
      INSERT INTO companies (name, contact_person, mobile, billing_type, rate, email, gst_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [name, contactPerson, mobile, billingType, rate, email || null, gstNumber || null]);

    const newCompanyId = result.insertId;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    const newCompanyData = { id: newCompanyId, name, contactPerson, mobile, billingType, rate, email, gstNumber };

    await logAudit(null, {
      userId: req.user.id,
      action: 'CREATE',
      entityType: 'companies',
      entityId: newCompanyId,
      oldValues: null,
      newValues: newCompanyData,
      ipAddress: clientIp
    });

    res.status(201).json({ success: true, data: newCompanyData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update company details
// @route   PUT /api/companies/:id
// @access  Private/OfficeStaff/Admin
export const updateCompany = async (req, res, next) => {
  const { id } = req.params;
  const { name, contactPerson, mobile, billingType, rate, email, gstNumber } = req.body;

  try {
    const [oldRows] = await pool.query('SELECT * FROM companies WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const oldValues = oldRows[0];

    const sql = `
      UPDATE companies 
      SET name = ?, contact_person = ?, mobile = ?, billing_type = ?, rate = ?, email = ?, gst_number = ?
      WHERE id = ?
    `;
    await pool.query(sql, [
      name || oldValues.name,
      contactPerson || oldValues.contact_person,
      mobile || oldValues.mobile,
      billingType || oldValues.billing_type,
      rate !== undefined ? rate : oldValues.rate,
      email !== undefined ? email : oldValues.email,
      gstNumber !== undefined ? gstNumber : oldValues.gst_number,
      id
    ]);

    const [newRows] = await pool.query('SELECT * FROM companies WHERE id = ?', [id]);
    const newValues = newRows[0];
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    await logAudit(null, {
      userId: req.user.id,
      action: 'UPDATE',
      entityType: 'companies',
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

// @desc    Soft delete company
// @route   DELETE /api/companies/:id
// @access  Private/Admin
export const deleteCompany = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [oldRows] = await pool.query('SELECT * FROM companies WHERE id = ? AND status = 1', [id]);
    if (oldRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const oldValues = oldRows[0];

    await pool.query('UPDATE companies SET status = 0 WHERE id = ?', [id]);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await logAudit(null, {
      userId: req.user.id,
      action: 'DELETE',
      entityType: 'companies',
      entityId: id,
      oldValues,
      newValues: null,
      ipAddress: clientIp
    });

    res.status(200).json({ success: true, message: 'Company soft-deleted successfully' });
  } catch (error) {
    next(error);
  }
};
