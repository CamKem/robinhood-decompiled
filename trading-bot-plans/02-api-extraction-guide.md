# API Extraction Guide

## Overview

This guide explains how to extract API endpoints, request/response models, and authentication requirements from the decompiled Robinhood Android app code.

## Repository Structure Reference

Based on the README, key locations for API extraction:

```
audit/sources/com/robinhood/
├── api/                          # API layer helpers, auth/token handling
│   ├── trade/equity/             # Equity trading APIs
│   ├── search/                   # Search APIs (stocks, crypto)
│   ├── newsfeed/                 # News feed API
│   └── identi/                   # Identity/Auth API
├── libmodelsequity/order/        # Order models and types
├── networking/                   # Networking utilities and interceptors
├── websocket/                    # WebSocket clients
└── android/idl/                  # IDL/Proto models (API contracts)
```

## Step-by-Step Extraction Process

### 1. Identify API Endpoints

#### Method 1: Search for Retrofit Interfaces

Robinhood uses Retrofit for HTTP networking. Look for interface definitions:

```bash
# Find all API interface files
find audit/sources -name "*Api.java" -o -name "*Service.java"

# Example findings:
# - TradeEquityBonfireApi.java
# - SearchCryptoBonfireApi.java
# - NewsFeedApi.java
```

**Example from decompiled code**:

```java
// audit/sources/com/robinhood/api/trade/equity/retrofit/TradeEquityBonfireApi.java
public interface TradeEquityBonfireApi {
    @POST("/orders/")
    Single<Order> placeOrder(@Body OrderRequest orderRequest);
    
    @GET("/orders/{order_id}/")
    Single<Order> getOrder(@Path("order_id") String orderId);
    
    @POST("/orders/{order_id}/cancel/")
    Single<Order> cancelOrder(@Path("order_id") String orderId);
    
    @GET("/accounts/{account_id}/positions/")
    Single<List<Position>> getPositions(@Path("account_id") String accountId);
}
```

#### Method 2: Search for URL Constants

Look for hardcoded URLs or base URL definitions:

```bash
# Search for API URLs
grep -r "https://" audit/sources/com/robinhood/ | grep -E "api\.|bonfire\."

# Common patterns:
# - https://api.robinhood.com
# - https://bonfire.robinhood.com
# - https://nummus.robinhood.com (crypto)
```

#### Method 3: Check URL Hosts Report

```bash
cat audit/reports/url_hosts.txt | grep robinhood
```

### 2. Extract Request/Response Models

#### Locate Model Classes

Models are typically POJOs (Plain Old Java Objects) with JSON annotations:

```bash
# Find model files
find audit/sources -path "*/model/*" -name "*.java"
find audit/sources -name "*Request.java" -o -name "*Response.java"
```

**Example Order Model**:

```java
// audit/sources/com/robinhood/libmodelsequity/order/Order.java
public class Order {
    @Json(name = "id")
    private String id;
    
    @Json(name = "symbol")
    private String symbol;
    
    @Json(name = "quantity")
    private String quantity;
    
    @Json(name = "side")
    private OrderSide side;  // "buy" or "sell"
    
    @Json(name = "type")
    private OrderType type;  // "market", "limit", "stop_loss", etc.
    
    @Json(name = "price")
    private String price;
    
    @Json(name = "state")
    private OrderState state;  // "queued", "confirmed", "filled", "cancelled"
    
    @Json(name = "created_at")
    private String createdAt;
    
    @Json(name = "updated_at")
    private String updatedAt;
    
    // Getters and setters...
}
```

### 3. Map Endpoints to TypeScript

Convert Java models to TypeScript interfaces:

**Java to TypeScript Mapping**:

```typescript
// TypeScript equivalent
export interface Order {
  id: string;
  symbol: string;
  quantity: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop_loss' | 'stop_limit';
  price?: string;
  stop_price?: string;
  time_in_force: 'gfd' | 'gtc' | 'ioc' | 'opg';
  state: 'queued' | 'confirmed' | 'filled' | 'cancelled' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface OrderRequest {
  account: string;
  instrument: string;
  symbol: string;
  type: Order['type'];
  time_in_force: Order['time_in_force'];
  side: Order['side'];
  quantity: string;
  price?: string;
  stop_price?: string;
}
```

## Key API Categories

### 1. Trading APIs

#### Equity Trading

**Base URL**: `https://api.robinhood.com` or `https://bonfire.robinhood.com`

**Endpoints**:

```typescript
// Place order
POST /orders/
Body: OrderRequest
Response: Order

// Get order details
GET /orders/{order_id}/
Response: Order

// Cancel order
POST /orders/{order_id}/cancel/
Response: Order

// Get all orders
GET /orders/?updated_at[gte]=2024-01-01
Response: { results: Order[], next: string | null }

// Get positions
GET /accounts/{account_id}/positions/
Response: { results: Position[] }
```

#### Crypto Trading

**Base URL**: `https://nummus.robinhood.com`

**Endpoints**:

```typescript
// Place crypto order
POST /orders/
Body: CryptoOrderRequest
Response: CryptoOrder

// Get crypto holdings
GET /holdings/
Response: { results: CryptoHolding[] }

// Get crypto account
GET /accounts/
Response: CryptoAccount
```

#### Options Trading

**Base URL**: `https://api.robinhood.com`

**Endpoints**:

```typescript
// Get options chains
GET /options/chains/?equity_instrument_ids={instrument_id}
Response: OptionsChain

// Place options order
POST /options/orders/
Body: OptionsOrderRequest
Response: OptionsOrder

// Get options positions
GET /options/aggregate_positions/
Response: { results: OptionsPosition[] }
```

### 2. Market Data APIs

**Endpoints**:

```typescript
// Get quote
GET /quotes/{symbol}/
Response: Quote

// Get multiple quotes
GET /quotes/?symbols={symbols}  // comma-separated
Response: { results: Quote[] }

// Get instrument by symbol
GET /instruments/?symbol={symbol}
Response: { results: Instrument[] }

// Get historical data
GET /quotes/historicals/{symbol}/?interval={interval}&span={span}
Response: { results: HistoricalQuote[] }

// Search instruments
GET /instruments/?query={query}
Response: { results: Instrument[] }
```

### 3. Account APIs

**Endpoints**:

```typescript
// Get account info
GET /accounts/{account_id}/
Response: Account

// Get portfolio
GET /accounts/{account_id}/portfolio/
Response: Portfolio

// Get buying power
GET /accounts/{account_id}/
Response: Account (includes buying_power)

// Get dividends
GET /dividends/
Response: { results: Dividend[] }
```

### 4. WebSocket Feeds

**Connection**:

```typescript
// Market data WebSocket
wss://api.robinhood.com/stream/

// Subscription message format
{
  "type": "subscribe",
  "service": "market_data",
  "symbols": ["AAPL", "TSLA"]
}
```

## Authentication

### Token-Based Authentication

From the decompiled code, Robinhood uses OAuth 2.0 Bearer tokens:

```typescript
// Header format
Authorization: Bearer {access_token}

// Additional headers observed:
'X-Robinhood-API-Version': '1.431.4',
'Content-Type': 'application/json',
'User-Agent': 'Robinhood/android-version'
```

### Token Management

```java
// From decompiled code patterns
// audit/sources/com/robinhood/api/auth/

// Login endpoint
POST /oauth2/token/
Body: {
  "grant_type": "password",
  "username": "user@example.com",
  "password": "password",
  "client_id": "{client_id}",
  "device_token": "{device_token}",
  "scope": "internal"
}
Response: {
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 86400,
  "token_type": "Bearer"
}

// Refresh token
POST /oauth2/token/
Body: {
  "grant_type": "refresh_token",
  "refresh_token": "{refresh_token}",
  "client_id": "{client_id}",
  "scope": "internal"
}
```

## Extraction Workflow

### Step 1: Create API Inventory

Create a spreadsheet or document listing:

| Endpoint | Method | Path | Request Body | Response | Auth Required |
|----------|--------|------|--------------|----------|---------------|
| Place Order | POST | /orders/ | OrderRequest | Order | Yes |
| Get Quote | GET | /quotes/{symbol}/ | - | Quote | Yes |
| ... | ... | ... | ... | ... | ... |

### Step 2: Map Java Classes to TypeScript

For each Java model found:

1. Identify the Java class (e.g., `Order.java`)
2. Note all fields and their types
3. Check for `@Json(name = "...")` annotations
4. Create equivalent TypeScript interface
5. Document any enums or nested types

### Step 3: Implement TypeScript Services

Organize endpoints into logical services:

```typescript
// src/services/trading.service.ts
export class TradingService {
  async placeOrder(request: OrderRequest): Promise<Order> { }
  async getOrder(orderId: string): Promise<Order> { }
  async cancelOrder(orderId: string): Promise<Order> { }
  async getPositions(accountId: string): Promise<Position[]> { }
}

// src/services/market-data.service.ts
export class MarketDataService {
  async getQuote(symbol: string): Promise<Quote> { }
  async getQuotes(symbols: string[]): Promise<Quote[]> { }
  async getHistoricalData(symbol: string, interval: string): Promise<HistoricalQuote[]> { }
}
```

## Common Patterns in Decompiled Code

### 1. Pagination

Many endpoints use cursor-based pagination:

```java
// Response pattern
{
  "results": [...],
  "next": "https://api.robinhood.com/orders/?cursor=abc123",
  "previous": null
}
```

### 2. Enums as Strings

Java enums become string literals in TypeScript:

```java
// Java
enum OrderSide { BUY, SELL }

// TypeScript
type OrderSide = 'buy' | 'sell';
```

### 3. Optional Fields

Look for `@Nullable` annotations:

```java
@Nullable
@Json(name = "stop_price")
private String stopPrice;

// TypeScript
stop_price?: string;
```

### 4. Date/Time Formats

Robinhood uses ISO 8601 format:

```typescript
// Example: "2024-01-24T09:30:00Z"
type ISODateTime = string;
```

## Tools and Scripts

### Automated Extraction Script

Create a script to help with extraction:

```typescript
// scripts/extract-models.ts
import * as fs from 'fs';
import * as path from 'path';

// Parse Java files and extract model definitions
function extractModels(javaFilePath: string): ModelDefinition {
  // Read Java file
  // Parse class structure
  // Extract fields and annotations
  // Generate TypeScript interface
}
```

### API Testing Script

```typescript
// scripts/test-endpoints.ts
// Test extracted endpoints to verify they work

const endpoints = [
  { method: 'GET', path: '/accounts/123/', description: 'Get account' },
  { method: 'GET', path: '/quotes/AAPL/', description: 'Get AAPL quote' },
  // ...
];

for (const endpoint of endpoints) {
  // Make request
  // Validate response
  // Document actual response structure
}
```

## Validation and Testing

### 1. Compare with Existing Documentation

Cross-reference with unofficial docs:
- https://github.com/sanko/Robinhood
- Community forums and discussions

### 2. Test in Development

Use the manual auth token method from README:

```typescript
// .env.development
ROBINHOOD_AUTH_TOKEN=Bearer {token_from_web_app}

// Test client
const client = new RobinhoodClient({
  authToken: process.env.ROBINHOOD_AUTH_TOKEN
});

const quote = await client.getQuote('AAPL');
console.log('AAPL Price:', quote.last_trade_price);
```

### 3. Document Discrepancies

If endpoints don't work as expected:
- Document the issue
- Try variations
- Check for version differences
- Look for alternative endpoints

## Common Challenges and Solutions

### Challenge 1: Obfuscated Code

**Issue**: Decompiler may produce hard-to-read code with generated names like `p271ui`, `C31614R`

**Solution**: Focus on:
- Interface definitions (clearer)
- Annotation patterns (`@GET`, `@POST`)
- String literals (URLs, field names)
- Public methods and classes

### Challenge 2: Missing/Incomplete Types

**Issue**: Some types may not be fully decompiled

**Solution**:
- Use `any` or `unknown` temporarily
- Test endpoints to discover actual structure
- Use TypeScript's structural typing to your advantage

### Challenge 3: Version Differences

**Issue**: Decompiled app may be from a specific version

**Solution**:
- Add API version to requests
- Be prepared to adapt to changes
- Use feature detection instead of version checking

## Next Steps

Once you've extracted the API definitions:

1. Implement the [TypeScript Client](./03-typescript-client.md)
2. Add comprehensive error handling
3. Implement caching and rate limiting
4. Create integration tests
5. Document all endpoints

## Resources

- **Decompiled Code**: `audit/sources/com/robinhood/`
- **Models**: Look for `@Json` annotations
- **Endpoints**: Search for Retrofit interfaces
- **Auth**: Check `audit/sources/com/robinhood/api/auth/`

## Example: Complete Extraction

Here's a complete example of extracting a trading endpoint:

### Step 1: Find Java Interface

```java
// audit/sources/com/robinhood/api/trade/equity/retrofit/TradeEquityBonfireApi.java
@POST("/orders/")
Single<Order> placeOrder(@Body OrderRequest orderRequest);
```

### Step 2: Find Request Model

```java
// OrderRequest.java
public class OrderRequest {
    @Json(name = "account") String account;
    @Json(name = "instrument") String instrument;
    @Json(name = "symbol") String symbol;
    @Json(name = "type") String type;
    @Json(name = "time_in_force") String timeInForce;
    @Json(name = "trigger") String trigger;
    @Json(name = "price") String price;
    @Json(name = "stop_price") String stopPrice;
    @Json(name = "quantity") String quantity;
    @Json(name = "side") String side;
}
```

### Step 3: Find Response Model

```java
// Order.java (shown earlier)
```

### Step 4: Create TypeScript Interface

```typescript
// src/types/trading.types.ts
export interface OrderRequest {
  account: string;
  instrument: string;
  symbol: string;
  type: 'market' | 'limit';
  time_in_force: 'gfd' | 'gtc' | 'ioc' | 'opg';
  trigger: 'immediate' | 'stop';
  price?: string;
  stop_price?: string;
  quantity: string;
  side: 'buy' | 'sell';
}

export interface Order {
  id: string;
  url: string;
  account: string;
  instrument: string;
  symbol: string;
  type: OrderRequest['type'];
  side: OrderRequest['side'];
  time_in_force: OrderRequest['time_in_force'];
  state: 'queued' | 'confirmed' | 'filled' | 'cancelled' | 'failed' | 'rejected';
  quantity: string;
  price?: string;
  average_price?: string;
  created_at: string;
  updated_at: string;
  executed_notional?: {
    amount: string;
    currency_code: string;
  };
}
```

### Step 5: Implement TypeScript Method

```typescript
// src/services/trading.service.ts
import { Order, OrderRequest } from '../types/trading.types';
import { ApiClient } from '../client/api-client';

export class TradingService {
  constructor(private client: ApiClient) {}

  async placeOrder(request: OrderRequest): Promise<Order> {
    return this.client.post<Order>('/orders/', request);
  }
}
```

Now you're ready to move on to building the complete [TypeScript Client](./03-typescript-client.md)!
