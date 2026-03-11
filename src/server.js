require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

// Safe port parsing
const parsePort = (port) => {
  // Agar port string hai to number mein convert karo
  const parsed = parseInt(port, 10);
  
  // Check if it's a valid number
  if (isNaN(parsed)) {
    return 5000; // Default port
  }
  
  // Check port range (0-65535)
  if (parsed < 0 || parsed > 65535) {
    logger.warn(`⚠️ Port ${parsed} is out of range (0-65535), using default 5000`);
    return 5000;
  }
  
  return parsed;
};

// Get port from env or use default
const PORT = parsePort(process.env.PORT);

logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`🔌 Attempting to use port: ${PORT}`);

const startServer = (port) => {
  const server = app.listen(port)
    .on('listening', () => {
      logger.info(`✅ Server running on port ${port}`);
    })
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`❌ Port ${port} is already in use!`);
        
        // Try next port (with validation)
        const nextPort = port + 1;
        if (nextPort <= 65535) {
          logger.info(`🔄 Trying next port: ${nextPort}`);
          startServer(nextPort);
        } else {
          logger.error('❌ No available ports in range');
          process.exit(1);
        }
      } else {
        logger.error('❌ Server error:', err);
        process.exit(1);
      }
    });

  // Graceful shutdown
  const shutdown = (signal) => {
    logger.info(`📥 ${signal} received: Shutting down gracefully`);
    
    server.close(() => {
      logger.info('🛑 HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('⚠️ Forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  process.on('uncaughtException', (err) => {
    logger.error('❌ Uncaught Exception:', err);
    shutdown('UNCAUGHT_EXCEPTION');
  });
  
  process.on('unhandledRejection', (err) => {
    logger.error('❌ Unhandled Rejection:', err);
    shutdown('UNHANDLED_REJECTION');
  });

  return server;
};
console.log(  PORT);
// Start the server
startServer(PORT);

module.exports = app;