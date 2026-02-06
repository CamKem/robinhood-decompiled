# Caching and Rate Limiting Strategy

## Overview

Proper caching and rate limiting are critical for:
- Respecting Robinhood's API limits
- Improving response times
- Reducing costs
- Avoiding account suspension

## Caching Strategy

### Cache Levels

```
L1: In-Memory Cache (fast, volatile)
     ↓
L2: Redis Cache (distributed, persistent)
     ↓
L3: API Call (slow, authoritative)
```

### Implementation

```typescript
// src/cache/cache-manager.ts
import Redis from 'ioredis';

export interface CacheConfig {
  defaultTTL: number;
  enableL1: boolean;
  enableL2: boolean;
}

export class CacheManager {
  private redis: Redis;
  private l1Cache: Map<string, CachedValue> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Cleanup L1 cache periodically
    setInterval(() => this.cleanupL1(), 60000);
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    if (this.config.enableL1) {
      const l1Value = this.l1Cache.get(key);
      if (l1Value && l1Value.expiresAt > Date.now()) {
        return l1Value.data as T;
      }
    }

    // Try L2 cache (Redis)
    if (this.config.enableL2) {
      const l2Value = await this.redis.get(key);
      if (l2Value) {
        const data = JSON.parse(l2Value);
        // Populate L1 cache
        if (this.config.enableL1) {
          this.l1Cache.set(key, {
            data,
            expiresAt: Date.now() + 60000, // 1 min in L1
          });
        }
        return data as T;
      }
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const actualTTL = ttl || this.config.defaultTTL;

    // Set in L1 cache
    if (this.config.enableL1) {
      this.l1Cache.set(key, {
        data: value,
        expiresAt: Date.now() + Math.min(actualTTL, 60000),
      });
    }

    // Set in L2 cache (Redis)
    if (this.config.enableL2) {
      await this.redis.setex(key, actualTTL, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.config.enableL2) {
      await this.redis.del(key);
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (pattern) {
      // Clear matching keys
      if (this.config.enableL2) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      // Clear L1 cache matching pattern
      for (const key of this.l1Cache.keys()) {
        if (this.matchesPattern(key, pattern)) {
          this.l1Cache.delete(key);
        }
      }
    } else {
      // Clear all
      this.l1Cache.clear();
      if (this.config.enableL2) {
        await this.redis.flushdb();
      }
    }
  }

  private cleanupL1(): void {
    const now = Date.now();
    for (const [key, value] of this.l1Cache.entries()) {
      if (value.expiresAt <= now) {
        this.l1Cache.delete(key);
      }
    }
  }

  private matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }
}

interface CachedValue {
  data: any;
  expiresAt: number;
}
```

### Cache TTL Guidelines

```typescript
// src/cache/cache-config.ts
export const cacheTTLs = {
  // Real-time data (short TTL)
  quote: 10,                    // 10 seconds
  orderbook: 5,                 // 5 seconds
  
  // Frequently changing data
  positions: 60,                // 1 minute
  portfolio: 60,                // 1 minute
  accountBalance: 60,           // 1 minute
  
  // Moderately changing data
  orders: 300,                  // 5 minutes
  historicalIntraday: 300,      // 5 minutes
  
  // Slow changing data
  instruments: 3600,            // 1 hour
  historicalDaily: 3600,        // 1 hour
  accountInfo: 3600,            // 1 hour
  
  // Static data
  optionsChains: 86400,         // 24 hours
  dividendCalendar: 86400,      // 24 hours
};
```

### Smart Cache Invalidation

```typescript
// src/cache/cache-invalidation.ts
export class CacheInvalidationManager {
  constructor(private cache: CacheManager) {}

  /**
   * Invalidate cache after order placement
   */
  async invalidateAfterOrder(symbol: string): Promise<void> {
    await Promise.all([
      this.cache.delete(`positions:*`),
      this.cache.delete(`portfolio:*`),
      this.cache.delete(`orders:*`),
      this.cache.delete(`balance:*`),
    ]);
  }

  /**
   * Invalidate cache after account deposit/withdrawal
   */
  async invalidateAfterTransfer(): Promise<void> {
    await Promise.all([
      this.cache.delete(`balance:*`),
      this.cache.delete(`portfolio:*`),
      this.cache.delete(`account:*`),
    ]);
  }

  /**
   * Selective invalidation based on event type
   */
  async invalidateOnEvent(event: CacheEvent): Promise<void> {
    switch (event.type) {
      case 'order_filled':
        await this.invalidateAfterOrder(event.symbol);
        break;
      case 'deposit':
      case 'withdrawal':
        await this.invalidateAfterTransfer();
        break;
      case 'market_close':
        // Keep cached data until market reopens
        break;
    }
  }
}

interface CacheEvent {
  type: 'order_filled' | 'deposit' | 'withdrawal' | 'market_close';
  symbol?: string;
}
```

## Rate Limiting

### Token Bucket Algorithm

```typescript
// src/rate-limit/token-bucket.ts
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number; // tokens per second

  constructor(capacity: number, refillRate: number) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens: number = 1): Promise<void> {
    this.refill();

    if (this.tokens < tokens) {
      const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
      await this.sleep(waitTime);
      this.refill();
    }

    this.tokens -= tokens;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
```

### Endpoint-Specific Rate Limiters

```typescript
// src/rate-limit/rate-limiter.ts
export class RateLimiter {
  private buckets: Map<string, TokenBucket> = new Map();
  private limits: Map<string, RateLimit> = new Map();

  constructor() {
    this.setupLimits();
  }

  private setupLimits(): void {
    // Based on Robinhood's actual limits (estimated)
    this.limits.set('/quotes/', { 
      capacity: 50, 
      refillRate: 20  // 20 requests/second
    });
    
    this.limits.set('/orders/', { 
      capacity: 10, 
      refillRate: 2   // 2 requests/second
    });
    
    this.limits.set('/accounts/', { 
      capacity: 20, 
      refillRate: 5   // 5 requests/second
    });
    
    // Global limit
    this.limits.set('*', { 
      capacity: 100, 
      refillRate: 30  // 30 requests/second overall
    });
  }

  async checkLimit(endpoint: string): Promise<void> {
    // Check endpoint-specific limit
    const endpointPattern = this.getEndpointPattern(endpoint);
    await this.consumeToken(endpointPattern);

    // Check global limit
    await this.consumeToken('*');
  }

  private async consumeToken(pattern: string): Promise<void> {
    let bucket = this.buckets.get(pattern);
    
    if (!bucket) {
      const limit = this.limits.get(pattern);
      if (!limit) return; // No limit defined
      
      bucket = new TokenBucket(limit.capacity, limit.refillRate);
      this.buckets.set(pattern, bucket);
    }

    await bucket.consume();
  }

  private getEndpointPattern(endpoint: string): string {
    // Match endpoint to pattern
    for (const pattern of this.limits.keys()) {
      if (pattern !== '*' && endpoint.includes(pattern)) {
        return pattern;
      }
    }
    return '*';
  }

  getStatus(): RateLimitStatus {
    const status: RateLimitStatus = {};
    for (const [pattern, bucket] of this.buckets.entries()) {
      const limit = this.limits.get(pattern)!;
      status[pattern] = {
        available: bucket.getAvailableTokens(),
        capacity: limit.capacity,
        refillRate: limit.refillRate,
      };
    }
    return status;
  }
}

interface RateLimit {
  capacity: number;
  refillRate: number;
}

interface RateLimitStatus {
  [pattern: string]: {
    available: number;
    capacity: number;
    refillRate: number;
  };
}
```

### Redis-Based Distributed Rate Limiting

For multiple bot instances:

```typescript
// src/rate-limit/distributed-rate-limiter.ts
import Redis from 'ioredis';

export class DistributedRateLimiter {
  private redis: Redis;

  constructor() {
    this.redis = new Redis();
  }

  async checkLimit(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();
    
    // Remove old entries
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Count requests in window
    multi.zcard(key);
    
    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry
    multi.expire(key, windowSeconds);

    const results = await multi.exec();
    const count = results![1][1] as number;

    return count < maxRequests;
  }

  async consumeOrWait(
    key: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<void> {
    while (true) {
      const allowed = await this.checkLimit(key, maxRequests, windowSeconds);
      if (allowed) {
        return;
      }
      // Wait a bit before retrying
      await this.sleep(1000);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
// src/rate-limit/circuit-breaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  
  private readonly threshold: number;
  private readonly timeout: number;

  constructor(threshold: number = 5, timeout: number = 60000) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}
```

## Integration with API Client

```typescript
// Updated API client with caching and rate limiting
export class ApiClient {
  constructor(
    config: ApiClientConfig,
    private cache: CacheManager,
    private rateLimiter: RateLimiter,
    private circuitBreaker: CircuitBreaker
  ) {
    // ... existing constructor code
  }

  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    cacheTTL?: number
  ): Promise<T> {
    // Check cache first
    if (cacheTTL) {
      const cacheKey = this.getCacheKey('GET', url, config);
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Check rate limits
    await this.rateLimiter.checkLimit(url);

    // Execute with circuit breaker
    const response = await this.circuitBreaker.execute(async () => {
      return this.axios.get<T>(url, config);
    });

    // Cache the response
    if (cacheTTL) {
      const cacheKey = this.getCacheKey('GET', url, config);
      await this.cache.set(cacheKey, response.data, cacheTTL);
    }

    return response.data;
  }

  private getCacheKey(
    method: string,
    url: string,
    config?: AxiosRequestConfig
  ): string {
    const params = config?.params ? JSON.stringify(config.params) : '';
    return `${method}:${url}:${params}`;
  }
}
```

## Monitoring

```typescript
// src/monitoring/rate-limit-monitor.ts
export class RateLimitMonitor {
  logRateLimitStatus(limiter: RateLimiter): void {
    const status = limiter.getStatus();
    
    for (const [pattern, stats] of Object.entries(status)) {
      const utilization = 
        ((stats.capacity - stats.available) / stats.capacity) * 100;
      
      if (utilization > 80) {
        console.warn(
          `⚠️ Rate limit for ${pattern} at ${utilization.toFixed(1)}% capacity`
        );
      }
    }
  }

  async alertOnRateLimit(event: RateLimitEvent): Promise<void> {
    // Send alert via Telegram or other channel
    console.log(`🚨 Rate limit event:`, event);
  }
}

interface RateLimitEvent {
  endpoint: string;
  timestamp: Date;
  waitTime: number;
}
```

## Configuration

```typescript
// config/cache-rate-limit.config.ts
export const cacheConfig = {
  enableL1: true,
  enableL2: process.env.NODE_ENV === 'production',
  defaultTTL: 60,
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT || '6379'),
};

export const rateLimitConfig = {
  globalLimit: {
    capacity: 100,
    refillRate: 30,
  },
  endpointLimits: {
    quotes: { capacity: 50, refillRate: 20 },
    orders: { capacity: 10, refillRate: 2 },
    accounts: { capacity: 20, refillRate: 5 },
  },
  circuitBreaker: {
    threshold: 5,
    timeout: 60000,
  },
};
```

## Testing

```typescript
// tests/rate-limiter.test.ts
describe('RateLimiter', () => {
  it('should respect rate limits', async () => {
    const limiter = new RateLimiter();
    const start = Date.now();
    
    // Try to make 15 requests (limit is 10 with refill of 2/s)
    for (let i = 0; i < 15; i++) {
      await limiter.checkLimit('/orders/');
    }
    
    const elapsed = Date.now() - start;
    
    // Should take at least 2.5 seconds
    expect(elapsed).toBeGreaterThan(2500);
  });
});
```

## Next Steps

1. Review [Deployment Strategy](./08-deployment.md)
2. Check [Code Examples](./09-examples.md)
3. Read [Getting Started Guide](./10-getting-started.md)
