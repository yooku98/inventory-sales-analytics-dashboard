// backend/middleware/errorHandler.js
import multer from 'multer';

export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      statusCode,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }

  // Multer errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') message = 'File too large. Maximum size is 5MB.';
    else if (err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Unexpected file field.';
    else message = `File upload error: ${err.message}`;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid authentication token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Authentication token has expired'; }

  // SQLite/LibSQL errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint'))) {
    statusCode = 409;
    message = 'Resource already exists';
  }
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint'))) {
    statusCode = 400;
    message = 'Referenced resource does not exist';
  }
  if (err.code === 'SQLITE_CONSTRAINT_NOTNULL') {
    statusCode = 400;
    message = 'Required field is missing';
  }

  // CORS errors
  if (err.message && err.message.includes('CORS')) {
    statusCode = 403;
    message = 'CORS policy: Origin not allowed';
  }

  const errorResponse = { error: message, status: statusCode };
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
