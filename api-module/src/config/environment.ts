import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().regex(/^\d+$/).transform(Number).default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().regex(/^\d+$/).transform(Number).default('0'),
  
  // Server Configuration
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().regex(/^\d+$/).transform(Number).default('12'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().regex(/^\d+$/).transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().regex(/^\d+$/).transform(Number).default('100'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['combined', 'common', 'dev', 'short', 'tiny']).default('combined'),
  
  // SSO Configuration
  ENABLE_SSO: z.string().transform(val => val === 'true').default('false'),
  SSO_BYPASS_DEV: z.string().transform(val => val === 'true').default('true'),
  
  // GitHub OAuth (optional when SSO disabled)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),
  
  // Development Authentication
  DEV_AUTO_LOGIN: z.string().transform(val => val === 'true').default('false'),
  DEV_DEFAULT_USER_EMAIL: z.string().email().optional().default('dev@example.com'),
  DEV_DEFAULT_USER_PASSWORD: z.string().optional().default('DevPassword123'),
});

export type Environment = z.infer<typeof envSchema>;

let config: Environment;

try {
  config = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
  }
  process.exit(1);
}

export default config;