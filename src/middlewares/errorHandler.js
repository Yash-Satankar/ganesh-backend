export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  if (statusCode >= 500) {
    console.error('Unhandled Server Error:', err);
  } else {
    console.warn(`Client Error (${statusCode}): ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      status: statusCode,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }
  });
};
