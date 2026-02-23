const logger = require('../utils/logger');
const { errorResponse } = require('../utils/response');

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Centralized error handler
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  logger.error(err.message, {
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    path: req.originalUrl,
    method: req.method,
  });

  return errorResponse(res, {
    message: err.message || 'Internal Server Error',
    statusCode,
  });
};

module.exports = { notFound, errorHandler };
