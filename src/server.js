import app from './app.js';
import dotenv from 'dotenv';
import { checkConnection } from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    // Verify database connection first
    await checkConnection();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup halted due to database failure.');
    process.exit(1);
  }
};

startServer();
