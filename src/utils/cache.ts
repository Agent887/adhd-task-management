import { CACHE } from '../worker';

interface CacheConfig {
  ttl?: number;  // Time to live in seconds
  priority?: 'high' | 'low';
}

const DEFAULT_TTL = 3600;  // 1 hour

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await CACHE.get(key);
      if (!data) return null;

      const { value, expiry } = JSON.parse(data);
      if (expiry && Date.now() > expiry) {
        await this.delete(key);
        return null;
      }
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, config: CacheConfig = {}): Promise<void> {
    try {
      const { ttl = DEFAULT_TTL, priority = 'low' } = config;
      const expiry = Date.now() + (ttl * 1000);
      
      const cacheData = JSON.stringify({
        value,
        expiry,
        priority
      });

      await CACHE.put(key, cacheData);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await CACHE.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Batch operations for efficiency
  async batchGet<T>(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    await Promise.all(
      keys.map(async (key) => {
        const value = await this.get<T>(key);
        if (value) results.set(key, value);
      })
    );
    return results;
  }

  // Auto-cleanup of expired items
  async cleanup(): Promise<void> {
    try {
      const keys = await CACHE.list();
      const now = Date.now();

      await Promise.all(
        keys.keys.map(async (key) => {
          const data = await this.get(key.name);
          if (!data) await this.delete(key.name);
        })
      );
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }
}
