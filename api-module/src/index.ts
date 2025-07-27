import { app } from '@/app';
import DatabaseService from '@/config/database';
import logger from '@/utils/logger';
import config from '@/config/environment';

async function startServer() {
  try {
    // Connect to database
    const dbService = DatabaseService.getInstance();
    await dbService.connect();

    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(`🚀 Server running on port ${config.PORT} in ${config.NODE_ENV} mode`);
      logger.info(`📊 Health check available at http://localhost:${config.PORT}/api/health`);
      logger.info(`📚 API endpoints available at http://localhost:${config.PORT}/api`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await dbService.disconnect();
          logger.info('Database disconnected');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('UNHANDLED_REJECTION');
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  startServer();
}