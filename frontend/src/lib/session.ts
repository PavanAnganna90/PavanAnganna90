import { getRedisClient } from './db';

export interface SessionData {
  userId: string;
  email: string;
  role: string;
  permissions: string[];
  lastActivity: number;
}

const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

export class SessionManager {
  private redis = getRedisClient();
  private keyPrefix = 'session:';

  // Create a new session
  async createSession(sessionId: string, data: SessionData): Promise<void> {
    const key = this.keyPrefix + sessionId;
    const sessionData = {
      ...data,
      lastActivity: Date.now(),
    };
    
    await this.redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
  }

  // Get session data
  async getSession(sessionId: string): Promise<SessionData | null> {
    const key = this.keyPrefix + sessionId;
    const data = await this.redis.get(key);
    
    if (!data) return null;

    try {
      const sessionData: SessionData = JSON.parse(data);
      
      // Update last activity
      sessionData.lastActivity = Date.now();
      await this.redis.setex(key, SESSION_TTL, JSON.stringify(sessionData));
      
      return sessionData;
    } catch (error) {
      console.error('Error parsing session data:', error);
      return null;
    }
  }

  // Update session data
  async updateSession(sessionId: string, updates: Partial<SessionData>): Promise<void> {
    const existing = await this.getSession(sessionId);
    if (!existing) throw new Error('Session not found');

    const updated = { ...existing, ...updates, lastActivity: Date.now() };
    const key = this.keyPrefix + sessionId;
    
    await this.redis.setex(key, SESSION_TTL, JSON.stringify(updated));
  }

  // Delete session
  async deleteSession(sessionId: string): Promise<void> {
    const key = this.keyPrefix + sessionId;
    await this.redis.del(key);
  }

  // Get all active sessions for a user
  async getUserSessions(userId: string): Promise<string[]> {
    const pattern = this.keyPrefix + '*';
    const keys = await this.redis.keys(pattern);
    const activeSessions: string[] = [];

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData: SessionData = JSON.parse(data);
          if (sessionData.userId === userId) {
            activeSessions.push(key.replace(this.keyPrefix, ''));
          }
        } catch (error) {
          console.error('Error parsing session data for key:', key, error);
        }
      }
    }

    return activeSessions;
  }

  // Cleanup expired sessions (called periodically)
  async cleanupExpiredSessions(): Promise<number> {
    const pattern = this.keyPrefix + '*';
    const keys = await this.redis.keys(pattern);
    let cleaned = 0;

    const expireThreshold = Date.now() - (SESSION_TTL * 1000);

    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        try {
          const sessionData: SessionData = JSON.parse(data);
          if (sessionData.lastActivity < expireThreshold) {
            await this.redis.del(key);
            cleaned++;
          }
        } catch (error) {
          // Invalid session data, delete it
          await this.redis.del(key);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // Get session count
  async getActiveSessionCount(): Promise<number> {
    const pattern = this.keyPrefix + '*';
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }
}

export const sessionManager = new SessionManager();