import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Standard middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test health endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Server is healthy' });
});

// Bind API routes
app.use('/api', apiRoutes);

// Catch-all route not found handler
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Error handling middleware
app.use(errorHandler);

export default app;
