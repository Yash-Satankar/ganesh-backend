import pool from '../config/db.js';

// @desc    Get change history / audit logs
// @route   GET /api/history
// @access  Private
export const getAuditLogs = async (req, res, next) => {
  const { entityType, entityId } = req.query;
  try {
    let sql = `
      SELECT al.*, u.name AS userName, u.role AS userRole
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (entityType) {
      conditions.push('al.entity_type = ?');
      params.push(entityType);
    }
    if (entityId) {
      conditions.push('al.entity_id = ?');
      params.push(entityId);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY al.created_at DESC';

    const [rows] = await pool.query(sql, params);
    
    // Parse json strings back to objects for the client response
    const parsedData = rows.map(row => ({
      ...row,
      old_values: typeof row.old_values === 'string' ? JSON.parse(row.old_values) : row.old_values,
      new_values: typeof row.new_values === 'string' ? JSON.parse(row.new_values) : row.new_values
    }));

    res.status(200).json({ success: true, data: parsedData });
  } catch (error) {
    next(error);
  }
};
