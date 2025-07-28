import { PrismaClient } from '@prisma/client';
import logger from '@/utils/logger';
import config from './environment';

class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    // Enhanced Prisma configuration with connection pooling
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.buildDatabaseUrl(config.DATABASE_URL),
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.setupEventListeners();
  }

  private buildDatabaseUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    
    // Connection pool configuration based on environment
    const poolConfig = {
      connection_limit: config.NODE_ENV === 'production' ? 20 : 5,
      connect_timeout: 60,
      pool_timeout: 10,
      statement_timeout: 30,
    };
    
    // Add connection pool parameters
    Object.entries(poolConfig).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString());
    });
    
    // Enable connection pooling and set schema
    url.searchParams.set('pgbouncer', 'true');
    url.searchParams.set('schema', 'public');
    
    return url.toString();
  }

  private setupEventListeners() {
    this.prisma.$on('query', (e) => {
      logger.debug('Prisma Query', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Prisma Error', e);
    });

    this.prisma.$on('info', (e) => {
      logger.info('Prisma Info', e);
    });

    this.prisma.$on('warn', (e) => {
      logger.warn('Prisma Warning', e);
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', error);
      return false;
    }
  }

  public async getMetrics(): Promise<any> {
    try {
      // Get database connection metrics
      const result = await this.prisma.$queryRaw`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
      `;
      return result;
    } catch (error) {
      logger.error('Failed to get database metrics', error);
      return null;
    }
  }
}

export default DatabaseService;