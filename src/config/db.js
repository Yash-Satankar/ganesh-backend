import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ganesh_transport',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
});

// Helper to check connection on startup
export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection pool established successfully.');
    connection.release();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
};

export default pool;
