# @robinhood-trading/shared-types

Shared TypeScript types and interfaces for the Robinhood trading monorepo.

## Purpose

This package contains common type definitions used across all packages in the monorepo, including:
- Trading types (orders, positions, quotes)
- Account types
- API response interfaces
- WebSocket message types

## Installation

This package is meant to be used within the monorepo workspace:

```bash
npm install
```

## Usage

```typescript
import { Order, Quote, Position, OrderRequest } from '@robinhood-trading/shared-types';

const order: OrderRequest = {
  symbol: 'AAPL',
  side: 'buy',
  type: 'market',
  quantity: 10,
  timeInForce: 'gfd'
};
```

## Available Types

### Trading Types
- `OrderSide`: 'buy' | 'sell'
- `OrderType`: 'market' | 'limit' | 'stop_loss' | 'stop_limit'
- `OrderState`: Current state of an order
- `TimeInForce`: Order duration
- `AssetType`: Type of asset being traded

### Interfaces
- `OrderRequest`: Create new order
- `Order`: Order details
- `Quote`: Market data
- `Position`: Current position
- `Account`: Account information
- `Portfolio`: Portfolio summary
- `ApiResponse<T>`: Generic API response wrapper
- `ApiError`: Error details
- `WebSocketMessage`: Real-time data

## Development

```bash
# Build
npm run build

# Watch mode
npm run watch

# Type check
npm run type-check

# Clean
npm run clean
```

## Agent Task

This package can be worked on independently by agents focusing on:
- Extracting additional types from decompiled code
- Adding JSDoc comments
- Creating utility types and type guards
- Validating types against actual API responses
