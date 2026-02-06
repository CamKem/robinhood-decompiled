# @robinhood-trading/utils

Common utilities and helper functions for the Robinhood trading monorepo.

## Purpose

This package provides shared utilities used across all packages, including:
- Logging (Winston-based structured logging)
- Retry logic with exponential backoff
- Async utilities (sleep, debounce, throttle)
- Common helper functions

## Installation

```bash
npm install
```

## Usage

### Logger

```typescript
import { Logger } from '@robinhood-trading/utils';

const logger = new Logger('my-service');

logger.info('Service started');
logger.error('Failed to process order', error);
logger.debug('Processing request', { orderId: '123' });
```

### Retry

```typescript
import { retry } from '@robinhood-trading/utils';

const result = await retry(
  () => apiClient.getQuote('AAPL'),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2
  }
);
```

### Async Utilities

```typescript
import { sleep, debounce, throttle } from '@robinhood-trading/utils';

// Sleep
await sleep(1000);

// Debounce
const debouncedFn = debounce(myFunction, 500);

// Throttle
const throttledFn = throttle(myFunction, 1000);
```

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Test
npm run test

# Type check
npm run type-check

# Clean
npm run clean
```

## Agent Task

This package can be worked on independently by agents focusing on:
- Adding validation utilities
- Creating formatting helpers
- Implementing caching utilities
- Adding rate limiting helpers
- Creating data transformation utilities
