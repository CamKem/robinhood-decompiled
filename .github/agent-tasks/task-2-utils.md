# Task 2: Expand Utils Package

## Package
`packages/utils`

## Priority
High (Phase 1 - No dependencies)

## Description
Expand the utilities package with commonly needed functions for the trading bot, including caching, rate limiting, validation, and data formatting utilities.

## Dependencies
- `shared-types` (minimal - only for type imports)

## Reference Documentation
- Caching guide: `/trading-bot-plans/07-caching-rate-limiting.md`
- Architecture: `/trading-bot-plans/01-architecture-overview.md`

## Goals

### 1. Caching Utilities
Create `src/cache.ts`:
```typescript
export class Cache {
  // In-memory cache with TTL
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlSeconds: number): void;
  delete(key: string): void;
  clear(): void;
}
```

### 2. Rate Limiting
Create `src/rate-limiter.ts`:
```typescript
export class RateLimiter {
  // Token bucket or sliding window rate limiter
  async acquire(key: string): Promise<void>;
  remaining(key: string): number;
}
```

### 3. Validation Utilities
Create `src/validators.ts`:
```typescript
export function validateSymbol(symbol: string): boolean;
export function validateQuantity(quantity: number): boolean;
export function validatePrice(price: number): boolean;
```

### 4. Formatting Utilities
Create `src/formatters.ts`:
```typescript
export function formatCurrency(amount: number): string;
export function formatPercent(value: number): string;
export function formatDate(date: Date): string;
export function formatSymbol(symbol: string): string;
```

### 5. Error Handling
Create `src/errors.ts`:
```typescript
export class TradingError extends Error { }
export class ValidationError extends TradingError { }
export class ApiError extends TradingError { }
export class RateLimitError extends TradingError { }
```

### 6. Math Utilities
Create `src/math.ts`:
```typescript
export function roundToDecimal(value: number, decimals: number): number;
export function calculatePercentChange(from: number, to: number): number;
export function calculateGainLoss(cost: number, current: number): number;
```

## Deliverables

1. **New utility modules**:
   - `src/cache.ts` - Caching with TTL
   - `src/rate-limiter.ts` - Rate limiting
   - `src/validators.ts` - Input validation
   - `src/formatters.ts` - Data formatting
   - `src/errors.ts` - Custom error classes
   - `src/math.ts` - Math utilities

2. **Tests**:
   - Unit tests for all utilities
   - Test coverage > 80%

3. **Documentation**:
   - JSDoc for all functions
   - Usage examples in README
   - Performance considerations

## Success Criteria

- [ ] All utility modules are implemented
- [ ] Cache supports TTL and eviction
- [ ] Rate limiter implements token bucket algorithm
- [ ] Validators cover all input types
- [ ] Formatters handle edge cases (null, undefined)
- [ ] Custom error classes are properly typed
- [ ] Package builds: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] No TypeScript errors
- [ ] Documentation is complete

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/utils

# Install dependencies
npm install

# Build
npm run build

# Test
npm run test

# Watch mode
npm run watch
```

## Implementation Notes

### Cache Strategy
- Use Map for in-memory storage
- Implement LRU eviction for memory management
- Support different TTL per key
- Optional: Add Redis support for distributed caching

### Rate Limiter
- Token bucket algorithm recommended
- Support per-endpoint limits
- Handle burst traffic
- Return time until next token available

### Validators
- Validate symbol format (uppercase, alphanumeric)
- Validate quantity (positive, integer for stocks)
- Validate price (positive, reasonable range)
- Validate order types and parameters

### Formatters
- Currency: $1,234.56
- Percent: +12.34% or -5.67%
- Date: ISO 8601 or human-readable
- Handle null/undefined gracefully

## References

From planning docs:
- Cache TTL recommendations (07-caching-rate-limiting.md):
  - Quote data: 5-15 seconds
  - Account data: 1-5 minutes
  - Historical data: 1 hour
  - Static data: 24 hours
