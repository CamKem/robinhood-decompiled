# TypeScript Client Implementation

## Overview

This document outlines the implementation of a robust, type-safe TypeScript client for the Robinhood API based on the extracted endpoints from the decompiled Android app.

## Project Structure

```
robinhood-ts-client/
├── src/
│   ├── client/
│   │   ├── api-client.ts           # Base HTTP client
│   │   ├── auth-manager.ts         # Authentication handling
│   │   ├── rate-limiter.ts         # Rate limiting
│   │   └── websocket-client.ts     # WebSocket manager
│   ├── services/
│   │   ├── trading.service.ts      # Trading operations
│   │   ├── market-data.service.ts  # Market data
│   │   ├── account.service.ts      # Account management
│   │   ├── crypto.service.ts       # Crypto trading
│   │   ├── options.service.ts      # Options trading
│   │   └── futures.service.ts      # Futures trading
│   ├── types/
│   │   ├── trading.types.ts        # Trading types
│   │   ├── market.types.ts         # Market data types
│   │   ├── account.types.ts        # Account types
│   │   ├── common.types.ts         # Common types
│   │   └── index.ts                # Type exports
│   ├── utils/
│   │   ├── logger.ts               # Logging utility
│   │   ├── error-handler.ts        # Error handling
│   │   └── validators.ts           # Input validation
│   ├── config/
│   │   └── constants.ts            # Configuration constants
│   └── index.ts                    # Main export
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Core Components

### 1. Base API Client

The foundation for all API calls:

```typescript
// src/client/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { AuthManager } from './auth-manager';
import { RateLimiter } from './rate-limiter';
import { Logger } from '../utils/logger';
import { ApiError } from '../utils/error-handler';

export interface ApiClientConfig {
  baseURL?: string;
  authToken?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheConfig?: CacheConfig;
}

export interface CacheConfig {
  ttl: number;  // Time to live in seconds
  maxSize?: number;
}

export class ApiClient {
  private axios: AxiosInstance;
  private authManager: AuthManager;
  private rateLimiter: RateLimiter;
  private logger: Logger;
  private cache: Map<string, CachedResponse>;

  constructor(config: ApiClientConfig) {
    this.logger = new Logger('ApiClient');
    this.authManager = new AuthManager(config.authToken);
    this.rateLimiter = new RateLimiter();
    this.cache = new Map();

    // Create axios instance
    this.axios = axios.create({
      baseURL: config.baseURL || 'https://api.robinhood.com',
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-Robinhood-API-Version': '1.431.4',
      },
    });

    // Add request interceptor for auth and rate limiting
    this.axios.interceptors.request.use(
      async (config) => {
        // Check rate limits
        await this.rateLimiter.checkLimit(config.url || '');

        // Add auth token
        const token = await this.authManager.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        this.logger.debug(`Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      (response) => {
        this.logger.debug(`Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * GET request with caching support
   */
  async get<T>(
    url: string,
    config?: AxiosRequestConfig,
    cacheTTL?: number
  ): Promise<T> {
    // Check cache first
    if (cacheTTL) {
      const cached = this.getFromCache<T>(url);
      if (cached) {
        this.logger.debug(`Cache hit: ${url}`);
        return cached;
      }
    }

    const response = await this.axios.get<T>(url, config);
    
    // Cache the response
    if (cacheTTL) {
      this.setCache(url, response.data, cacheTTL);
    }

    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response = await this.axios.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.axios.delete<T>(url, config);
    return response.data;
  }

  /**
   * Handle paginated endpoints
   */
  async *getPaginated<T>(
    url: string,
    config?: AxiosRequestConfig
  ): AsyncGenerator<T[], void, undefined> {
    let nextUrl: string | null = url;

    while (nextUrl) {
      const response = await this.get<PaginatedResponse<T>>(nextUrl, config);
      yield response.results;
      nextUrl = response.next;
    }
  }

  /**
   * Error handling with retry logic
   */
  private async handleError(error: any): Promise<never> {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      // Handle specific error codes
      switch (status) {
        case 401:
          // Token expired, try to refresh
          this.logger.warn('Auth token expired, attempting refresh...');
          await this.authManager.refreshToken();
          // Retry the original request
          return this.axios.request(error.config);

        case 429:
          // Rate limited
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          this.logger.warn(`Rate limited, waiting ${retryAfter}s`);
          await this.sleep(retryAfter * 1000);
          return this.axios.request(error.config);

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors - retry with exponential backoff
          return this.retryWithBackoff(error.config);

        default:
          throw new ApiError(
            `API Error: ${status}`,
            status,
            data
          );
      }
    }

    throw error;
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff(
    config: AxiosRequestConfig,
    attempt: number = 1,
    maxRetries: number = 3
  ): Promise<any> {
    if (attempt > maxRetries) {
      throw new ApiError('Max retries exceeded', 0, null);
    }

    const delay = Math.pow(2, attempt) * 1000;
    this.logger.info(`Retrying request (attempt ${attempt}/${maxRetries}) after ${delay}ms`);
    
    await this.sleep(delay);
    
    try {
      return await this.axios.request(config);
    } catch (error) {
      return this.retryWithBackoff(config, attempt + 1, maxRetries);
    }
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.info('Cache cleared');
  }
}

interface PaginatedResponse<T> {
  results: T[];
  next: string | null;
  previous: string | null;
  count?: number;
}

interface CachedResponse {
  data: any;
  expiresAt: number;
}
```

### 2. Authentication Manager

```typescript
// src/client/auth-manager.ts
import { Logger } from '../utils/logger';

export interface AuthToken {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  expires_at?: number;
}

export class AuthManager {
  private logger: Logger;
  private currentToken: AuthToken | null = null;
  private tokenRefreshPromise: Promise<AuthToken> | null = null;

  constructor(initialToken?: string) {
    this.logger = new Logger('AuthManager');
    
    if (initialToken) {
      // Parse token from env (Bearer token format)
      this.currentToken = {
        access_token: initialToken.replace('Bearer ', ''),
        token_type: 'Bearer',
        expires_in: 86400, // Default 24h
        expires_at: Date.now() + 86400 * 1000,
      };
    }
  }

  /**
   * Get current valid token
   */
  async getToken(): Promise<string | null> {
    if (!this.currentToken) {
      return null;
    }

    // Check if token is expired or about to expire (5 min buffer)
    if (this.isTokenExpired(this.currentToken, 300)) {
      this.logger.info('Token expired or expiring soon, refreshing...');
      return this.refreshToken();
    }

    return this.currentToken.access_token;
  }

  /**
   * Set token manually (from env or other source)
   */
  setToken(token: string | AuthToken): void {
    if (typeof token === 'string') {
      this.currentToken = {
        access_token: token.replace('Bearer ', ''),
        token_type: 'Bearer',
        expires_in: 86400,
        expires_at: Date.now() + 86400 * 1000,
      };
    } else {
      this.currentToken = {
        ...token,
        expires_at: Date.now() + token.expires_in * 1000,
      };
    }
    this.logger.info('Token updated');
  }

  /**
   * Refresh token
   */
  async refreshToken(): Promise<string> {
    // Prevent concurrent refresh requests
    if (this.tokenRefreshPromise) {
      this.logger.debug('Token refresh already in progress, waiting...');
      const token = await this.tokenRefreshPromise;
      return token.access_token;
    }

    if (!this.currentToken?.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.tokenRefreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.tokenRefreshPromise;
      this.currentToken = newToken;
      this.logger.info('Token refreshed successfully');
      return newToken.access_token;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh API call
   */
  private async performTokenRefresh(): Promise<AuthToken> {
    // This would call the Robinhood OAuth endpoint
    // For now, throw error as manual token is being used
    throw new Error('Token refresh not implemented - using manual token from .env');
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(token: AuthToken, bufferSeconds: number = 0): boolean {
    if (!token.expires_at) {
      return false; // Can't determine expiry
    }
    return Date.now() >= token.expires_at - bufferSeconds * 1000;
  }

  /**
   * Clear current token
   */
  clearToken(): void {
    this.currentToken = null;
    this.logger.info('Token cleared');
  }
}
```

### 3. Rate Limiter

```typescript
// src/client/rate-limiter.ts
import { Logger } from '../utils/logger';

interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private logger: Logger;
  private buckets: Map<string, RateLimitBucket>;
  private defaultConfig: RateLimitConfig = {
    requestsPerSecond: 10,
    burstSize: 20,
  };

  // Endpoint-specific rate limits (from Robinhood's actual limits)
  private endpointLimits: Map<string, RateLimitConfig> = new Map([
    ['/quotes/', { requestsPerSecond: 20, burstSize: 40 }],
    ['/orders/', { requestsPerSecond: 5, burstSize: 10 }],
    ['/accounts/', { requestsPerSecond: 10, burstSize: 20 }],
  ]);

  constructor() {
    this.logger = new Logger('RateLimiter');
    this.buckets = new Map();
  }

  /**
   * Check and consume rate limit token
   */
  async checkLimit(endpoint: string): Promise<void> {
    const config = this.getConfigForEndpoint(endpoint);
    const bucket = this.getOrCreateBucket(endpoint, config);

    // Refill tokens based on time passed
    this.refillBucket(bucket, config);

    // Wait if no tokens available
    if (bucket.tokens < 1) {
      const waitTime = this.calculateWaitTime(config);
      this.logger.warn(`Rate limit reached for ${endpoint}, waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.refillBucket(bucket, config);
    }

    // Consume a token
    bucket.tokens -= 1;
  }

  /**
   * Get rate limit config for endpoint
   */
  private getConfigForEndpoint(endpoint: string): RateLimitConfig {
    // Find matching endpoint pattern
    for (const [pattern, config] of this.endpointLimits) {
      if (endpoint.includes(pattern)) {
        return config;
      }
    }
    return this.defaultConfig;
  }

  /**
   * Get or create bucket for endpoint
   */
  private getOrCreateBucket(
    endpoint: string,
    config: RateLimitConfig
  ): RateLimitBucket {
    if (!this.buckets.has(endpoint)) {
      this.buckets.set(endpoint, {
        tokens: config.burstSize,
        lastRefill: Date.now(),
      });
    }
    return this.buckets.get(endpoint)!;
  }

  /**
   * Refill bucket based on time elapsed
   */
  private refillBucket(bucket: RateLimitBucket, config: RateLimitConfig): void {
    const now = Date.now();
    const timePassed = (now - bucket.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * config.requestsPerSecond;

    bucket.tokens = Math.min(
      config.burstSize,
      bucket.tokens + tokensToAdd
    );
    bucket.lastRefill = now;
  }

  /**
   * Calculate how long to wait for next token
   */
  private calculateWaitTime(config: RateLimitConfig): number {
    return (1 / config.requestsPerSecond) * 1000; // milliseconds
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset all rate limits
   */
  reset(): void {
    this.buckets.clear();
    this.logger.info('Rate limits reset');
  }
}
```

### 4. Trading Service

```typescript
// src/services/trading.service.ts
import { ApiClient } from '../client/api-client';
import { Order, OrderRequest, Position, Portfolio } from '../types/trading.types';
import { Logger } from '../utils/logger';

export class TradingService {
  private logger: Logger;

  constructor(private client: ApiClient) {
    this.logger = new Logger('TradingService');
  }

  /**
   * Place a new order
   */
  async placeOrder(request: OrderRequest): Promise<Order> {
    this.logger.info(`Placing ${request.side} order for ${request.quantity} ${request.symbol}`);
    
    // Validate order
    this.validateOrder(request);

    return this.client.post<Order>('/orders/', request);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    return this.client.get<Order>(`/orders/${orderId}/`, {}, 60); // Cache for 60s
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<Order> {
    this.logger.info(`Cancelling order ${orderId}`);
    return this.client.post<Order>(`/orders/${orderId}/cancel/`);
  }

  /**
   * Get all orders with optional filters
   */
  async getOrders(filters?: OrderFilters): Promise<Order[]> {
    const queryParams = new URLSearchParams();
    
    if (filters?.symbol) queryParams.set('instrument', filters.symbol);
    if (filters?.state) queryParams.set('state', filters.state);
    if (filters?.updatedAfter) {
      queryParams.set('updated_at[gte]', filters.updatedAfter.toISOString());
    }

    const url = `/orders/?${queryParams.toString()}`;
    const orders: Order[] = [];

    // Handle pagination
    for await (const page of this.client.getPaginated<Order>(url)) {
      orders.push(...page);
    }

    return orders;
  }

  /**
   * Get current positions
   */
  async getPositions(accountId: string): Promise<Position[]> {
    const url = `/accounts/${accountId}/positions/`;
    return this.client.get<Position[]>(url, {}, 300); // Cache for 5 min
  }

  /**
   * Get portfolio summary
   */
  async getPortfolio(accountId: string): Promise<Portfolio> {
    const url = `/accounts/${accountId}/portfolio/`;
    return this.client.get<Portfolio>(url, {}, 60); // Cache for 1 min
  }

  /**
   * Validate order before submission
   */
  private validateOrder(order: OrderRequest): void {
    if (!order.symbol) {
      throw new Error('Symbol is required');
    }
    if (!order.quantity || parseFloat(order.quantity) <= 0) {
      throw new Error('Quantity must be positive');
    }
    if (order.type === 'limit' && !order.price) {
      throw new Error('Limit orders require a price');
    }
    if (order.type === 'stop_loss' && !order.stop_price) {
      throw new Error('Stop loss orders require a stop price');
    }
  }
}

interface OrderFilters {
  symbol?: string;
  state?: Order['state'];
  updatedAfter?: Date;
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/api-client.test.ts
import { ApiClient } from '../../src/client/api-client';
import MockAdapter from 'axios-mock-adapter';

describe('ApiClient', () => {
  let client: ApiClient;
  let mockAxios: MockAdapter;

  beforeEach(() => {
    client = new ApiClient({ authToken: 'test-token' });
    mockAxios = new MockAdapter(client['axios']);
  });

  it('should make GET request', async () => {
    mockAxios.onGet('/test').reply(200, { data: 'test' });
    const result = await client.get('/test');
    expect(result).toEqual({ data: 'test' });
  });

  it('should handle 401 and refresh token', async () => {
    // Test implementation
  });

  it('should respect rate limits', async () => {
    // Test implementation
  });
});
```

### Integration Tests

```typescript
// tests/integration/trading.test.ts
import { RobinhoodClient } from '../../src/index';

describe('Trading Integration', () => {
  let client: RobinhoodClient;

  beforeAll(() => {
    client = new RobinhoodClient({
      authToken: process.env.ROBINHOOD_AUTH_TOKEN,
    });
  });

  it('should get account positions', async () => {
    const positions = await client.trading.getPositions('account-id');
    expect(Array.isArray(positions)).toBe(true);
  });

  // More integration tests...
});
```

## Configuration

```typescript
// .env.example
ROBINHOOD_AUTH_TOKEN=Bearer your-token-here
ROBINHOOD_BASE_URL=https://api.robinhood.com
ROBINHOOD_API_VERSION=1.431.4
LOG_LEVEL=debug
ENABLE_CACHE=true
CACHE_TTL=60
MAX_RETRIES=3
REQUEST_TIMEOUT=30000
```

## Error Handling

```typescript
// src/utils/error-handler.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseData: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

## Usage Example

```typescript
// Example: Using the client
import { RobinhoodClient } from 'robinhood-ts-client';

const client = new RobinhoodClient({
  authToken: process.env.ROBINHOOD_AUTH_TOKEN,
  enableCache: true,
});

// Get quote
const quote = await client.marketData.getQuote('AAPL');
console.log('AAPL:', quote.last_trade_price);

// Place order
const order = await client.trading.placeOrder({
  account: 'account-id',
  instrument: 'instrument-url',
  symbol: 'AAPL',
  type: 'market',
  side: 'buy',
  quantity: '1',
  time_in_force: 'gfd',
});

console.log('Order placed:', order.id);
```

## Next Steps

1. Implement all service classes following the patterns above
2. Add comprehensive type definitions in [Common Types](./types/)
3. Set up [Telegram integration](./04-telegram-integration.md)
4. Add [MCP support](./05-mcp-integration.md)
5. Implement proper [authentication flow](./06-authentication.md)
