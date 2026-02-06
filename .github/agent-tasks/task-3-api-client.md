# Task 3: Complete API Client Implementation

## Package
`packages/api-client`

## Priority
High (Phase 2 - After shared-types and utils)

## Description
Complete the Robinhood API client by extracting and implementing all trading endpoints from the decompiled Android app. This is the core package that all other services depend on.

## Dependencies
- `@robinhood-trading/shared-types` ✓
- `@robinhood-trading/utils` ✓

## Reference Documentation
- API extraction guide: `/trading-bot-plans/02-api-extraction-guide.md`
- TypeScript client plan: `/trading-bot-plans/03-typescript-client.md`
- Decompiled networking code: `/audit/sources/com/robinhood/networking/`
- API reports: `/audit/reports/url_hosts.txt`

## Goals

### 1. Extract API Endpoints
Search the decompiled code for Retrofit annotations:
```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled
grep -r "@GET\|@POST\|@PUT\|@DELETE" audit/sources/com/robinhood/api/ | head -50
```

Document all endpoints in `docs/endpoints.md`

### 2. Market Data Service
Create `src/services/market-data.service.ts`:
- `getQuote(symbol)` - GET /quotes/{symbol}/
- `getQuotes(symbols)` - GET /quotes/?symbols=...
- `getHistoricalData(symbol, interval, span)` - GET /marketdata/historicals/{symbol}/
- `getMarketHours()` - GET /markets/XNYS/hours/{date}/
- `getWatchlist()` - GET /watchlists/Default/

### 3. Account Service
Create `src/services/account.service.ts`:
- `getAccount()` - GET /accounts/
- `getProfile()` - GET /user/basic_info/
- `getPortfolio()` - GET /portfolios/
- `getPortfolioHistory()` - GET /portfolios/historicals/{id}/
- `getDividends()` - GET /dividends/

### 4. Crypto Service
Create `src/services/crypto.service.ts`:
- `getCryptoQuote(symbol)` - GET /marketdata/forex/quotes/{id}/
- `getCryptoAccount()` - GET /crypto/trading/accounts/
- `placeCryptoOrder(order)` - POST /crypto/orders/
- `getCryptoOrders()` - GET /crypto/orders/
- `cancelCryptoOrder(id)` - POST /crypto/orders/{id}/cancel/

### 5. Options Service
Create `src/services/options.service.ts`:
- `getOptionsChain(symbol)` - GET /options/chains/?equity_instrument_ids={id}
- `getOptionsPositions()` - GET /options/positions/
- `placeOptionsOrder(order)` - POST /options/orders/
- `getOptionsOrders()` - GET /options/orders/

### 6. WebSocket Manager
Create `src/websocket/ws-manager.ts`:
```typescript
export class WebSocketManager {
  connect(url: string): void;
  subscribe(channel: string, symbols: string[]): void;
  unsubscribe(channel: string): void;
  on(event: string, callback: (data: any) => void): void;
  disconnect(): void;
}
```

Reference: `/audit/sources/com/robinhood/websocket/`

### 7. Caching Layer
Integrate with @robinhood-trading/utils cache:
```typescript
// In each service method
const cached = cache.get(cacheKey);
if (cached) return cached;
const result = await apiCall();
cache.set(cacheKey, result, ttl);
return result;
```

### 8. Rate Limiting
Integrate with @robinhood-trading/utils rate limiter:
```typescript
await rateLimiter.acquire(endpoint);
const result = await apiCall();
```

## Deliverables

1. **Service implementations**:
   - `src/services/market-data.service.ts`
   - `src/services/account.service.ts`
   - `src/services/crypto.service.ts`
   - `src/services/options.service.ts`
   - Enhanced `src/services/trading.service.ts`

2. **WebSocket support**:
   - `src/websocket/ws-manager.ts`
   - `src/websocket/channels.ts`

3. **Documentation**:
   - `docs/endpoints.md` - All API endpoints
   - `docs/authentication.md` - Auth flow
   - Updated README with examples

4. **Tests**:
   - Integration tests for each service
   - Mock responses for testing

## Success Criteria

- [ ] All major API endpoints are implemented
- [ ] Services use caching appropriately
- [ ] Rate limiting is integrated
- [ ] WebSocket manager works
- [ ] Error handling is comprehensive
- [ ] Package builds: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Documentation is complete
- [ ] Examples work with real API

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/api-client

# Install dependencies (including workspace packages)
npm install

# Build
npm run build

# Test
npm run test

# Watch mode
npm run watch
```

## API Extraction Tips

1. **Find endpoints in decompiled code**:
```bash
# Search for Retrofit annotations
grep -r "@GET\|@POST" audit/sources/com/robinhood/ | grep -v ".class"

# Look for URL constants
grep -r "https://api.robinhood.com" audit/sources/

# Check URL hosts report
cat audit/reports/url_hosts.txt
```

2. **Understand request/response models**:
```bash
# Find data models
find audit/sources/com/robinhood/librobinhood/data -name "*.java"

# Find DTOs
find audit/sources/com/robinhood/rosetta -name "*Dto.java"
```

3. **Authentication headers**:
- Look in: `audit/sources/com/robinhood/networking/interceptor/`
- Authorization: Bearer {token}
- Content-Type: application/json

## Notes

- Base URL: https://api.robinhood.com
- Most endpoints require authentication
- Some endpoints are paginated (next/previous)
- WebSocket URL: wss://ws.robinhood.com/
- Respect rate limits (vary by endpoint)
- Cache aggressively to reduce API calls
