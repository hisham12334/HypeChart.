import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface IdempotencyResult {
  isNew: boolean;
  cachedResponse?: any;
}

export class IdempotencyService {
  private readonly TTL = 24 * 60 * 60; // 24 hours in seconds

  /**
   * Check if request with this idempotency key has been processed before
   * @param key - Unique idempotency key from client
   * @returns Object indicating if request is new and any cached response
   */
  async checkIdempotency(key: string): Promise<IdempotencyResult> {
    const cachedData = await redis.get(`idempotency:${key}`);
    
    if (cachedData) {
      return {
        isNew: false,
        cachedResponse: JSON.parse(cachedData)
      };
    }

    return { isNew: true };
  }

  /**
   * Store the response for this idempotency key
   * @param key - Unique idempotency key from client
   * @param response - Response data to cache
   */
  async storeResponse(key: string, response: any): Promise<void> {
    await redis.setex(
      `idempotency:${key}`,
      this.TTL,
      JSON.stringify(response)
    );
  }

  /**
   * Mark an idempotency key as processing (to prevent concurrent requests)
   * @param key - Unique idempotency key from client
   * @returns true if lock acquired, false if already processing
   */
  async acquireProcessingLock(key: string): Promise<boolean> {
    const lockKey = `idempotency:processing:${key}`;
    const acquired = await redis.set(lockKey, 'processing', 'EX', 60, 'NX');
    return acquired !== null;
  }

  /**
   * Release processing lock
   * @param key - Unique idempotency key from client
   */
  async releaseProcessingLock(key: string): Promise<void> {
    await redis.del(`idempotency:processing:${key}`);
  }

  /**
   * Generate idempotency key from request data (fallback if client doesn't provide)
   * @param data - Request data to hash
   * @returns Generated idempotency key
   */
  generateKey(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
  }
}
