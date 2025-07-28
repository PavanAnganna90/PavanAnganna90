import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { requestLogger } from '@/middleware/requestLogger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { generalLimiter } from '@/middleware/rateLimiter';
import routes from '@/routes';
import config from '@/config/environment';
import { swaggerSpec } from '@/config/swagger';
import { initializeRedis } from '@/config/redis';

const app = express();

// Initialize Redis
initializeRedis();

// Security middleware with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      connectSrc: ["'self'", "https:", "http:", "ws:", "wss:"],
      fontSrc: ["'self'", "https:", "http:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow specific origins
    const allowedOrigins = [
      config.CORS_ORIGIN,
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Response compression
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses if the client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Compress all responses by default
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is good balance)
  threshold: 1024, // Only compress responses > 1KB
  chunkSize: 16 * 1024, // 16KB chunks
}));

// Rate limiting
app.use(generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Swagger documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Documentation',
}));

// API routes
app.use('/api', routes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export { app };