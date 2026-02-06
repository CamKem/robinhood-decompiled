# @robinhood-trading/api-client

TypeScript API client for Robinhood based on endpoints extracted from the decompiled Android app.

## Purpose

This package provides a clean, type-safe API client for interacting with Robinhood's trading platform. It includes:
- HTTP client with retry logic and error handling
- Trading service for equity orders and positions
- Market data service (quotes, historical data)
- Account management service
- Crypto trading service
- Options trading service

## Installation

```bash
npm install
```

## Usage

### Initialize Client

```typescript
import { HttpClient, TradingService } from '@robinhood-trading/api-client';

const httpClient = new HttpClient(
  'https://api.robinhood.com',
  process.env.ROBINHOOD_AUTH_TOKEN
);

const tradingService = new TradingService(httpClient);
```

### Get Quote

```typescript
const quote = await tradingService.getQuote('AAPL');
console.log(`AAPL: $${quote.lastTradePrice}`);
```

### Place Order

```typescript
import { OrderRequest } from '@robinhood-trading/shared-types';

const orderRequest: OrderRequest = {
  symbol: 'AAPL',
  side: 'buy',
  type: 'market',
  quantity: 10,
  timeInForce: 'gfd'
};

const order = await tradingService.placeOrder(orderRequest);
console.log(`Order placed: ${order.id}`);
```

### Get Positions

```typescript
const positions = await tradingService.getPositions();
console.log('Current positions:', positions.results);
```

## API Endpoints

Based on decompiled code analysis:

- `GET /quotes/{symbol}/` - Get quote for a symbol
- `GET /quotes/?symbols={symbols}` - Get multiple quotes
- `GET /accounts/` - Get account information
- `GET /positions/` - Get current positions
- `POST /orders/` - Place an order
- `GET /orders/{id}/` - Get order details
- `POST /orders/{id}/cancel/` - Cancel an order
- `GET /orders/` - Get order history
- `GET /instruments/?symbol={symbol}` - Get instrument info

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
- Extracting additional API endpoints from decompiled code
- Adding crypto trading service
- Adding options trading service
- Adding market data service (historical data, charts)
- Adding WebSocket support for real-time data
- Implementing response caching
- Adding rate limiting
- Creating integration tests
- Documenting all API endpoints
