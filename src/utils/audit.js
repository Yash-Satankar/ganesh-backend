import pool from '../config/db.js';

/**
 * Inserts a history record into the audit_logs table.
 * Supports running within an active transaction if a connection is provided.
 */
export const logAudit = async (conn, { userId, action, entityType, entityId, oldValues, newValues, ipAddress }) => {
  const queryExecutor = conn || pool;
  
  const sql = `
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const oldValuesJson = oldValues ? JSON.stringify(oldValues) : null;
  const newValuesJson = newValues ? JSON.stringify(newValues) : null;

  try {
    await queryExecutor.query(sql, [
      userId || null,
      action,
      entityType,
      entityId,
      oldValuesJson,
      newValuesJson,
      ipAddress || null
    ]);
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
    // In production, we might want to log this but not crash the main transaction,
    // or block the operation if audit trail compliance is strict.
  }
};
