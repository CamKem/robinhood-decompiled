# Task 4: Build Trading Service

## Package
`packages/trading-service`

## Priority
Medium (Phase 2 - After api-client)

## Description
Build the core trading engine that implements business logic, risk management, portfolio tracking, and trading strategies.

## Dependencies
- `@robinhood-trading/shared-types` ✓
- `@robinhood-trading/utils` ✓
- `@robinhood-trading/api-client` ✓

## Reference Documentation
- Architecture: `/trading-bot-plans/01-architecture-overview.md`
- Examples: `/trading-bot-plans/09-examples.md`

## Goals

### 1. Order Manager
Create `src/order-manager.ts`:
```typescript
export class OrderManager {
  // Validate order before placing
  validateOrder(order: OrderRequest): ValidationResult;
  
  // Place order with pre-flight checks
  async placeOrder(order: OrderRequest): Promise<Order>;
  
  // Monitor order status
  async monitorOrder(orderId: string): Promise<OrderState>;
  
  // Cancel order
  async cancelOrder(orderId: string): Promise<void>;
}
```

### 2. Risk Manager
Create `src/risk-manager.ts`:
```typescript
export class RiskManager {
  // Check if trade is within risk limits
  async assessRisk(order: OrderRequest, account: Account): Promise<RiskAssessment>;
  
  // Calculate position size
  calculatePositionSize(symbol: string, riskPercent: number): number;
  
  // Check portfolio diversification
  checkDiversification(portfolio: Portfolio): DiversificationReport;
  
  // Validate buying power
  validateBuyingPower(order: OrderRequest, account: Account): boolean;
}
```

### 3. Position Tracker
Create `src/position-tracker.ts`:
```typescript
export class PositionTracker {
  // Get current positions
  async getPositions(): Promise<Position[]>;
  
  // Get position for symbol
  async getPosition(symbol: string): Promise<Position | null>;
  
  // Calculate P&L for position
  calculatePnL(position: Position, currentPrice: number): PnLResult;
  
  // Track cost basis
  trackCostBasis(trades: Order[]): CostBasis;
}
```

### 4. Portfolio Manager
Create `src/portfolio-manager.ts`:
```typescript
export class PortfolioManager {
  // Get portfolio summary
  async getPortfolio(): Promise<Portfolio>;
  
  // Calculate total value
  calculateTotalValue(positions: Position[], quotes: Quote[]): number;
  
  // Calculate P&L
  calculateTotalPnL(portfolio: Portfolio): PnLSummary;
  
  // Get portfolio performance
  getPerformance(period: string): PerformanceMetrics;
}
```

### 5. Strategy Engine
Create `src/strategies/strategy-engine.ts`:
```typescript
export interface Strategy {
  name: string;
  analyze(data: MarketData): Signal;
  generateOrder(signal: Signal): OrderRequest | null;
}

export class StrategyEngine {
  registerStrategy(strategy: Strategy): void;
  runStrategy(strategyName: string, symbol: string): Promise<OrderRequest | null>;
  backtestStrategy(strategy: Strategy, historicalData: any): BacktestResult;
}
```

### 6. Example Strategies
Create simple strategies:
- `src/strategies/buy-hold.ts` - Buy and hold
- `src/strategies/stop-loss.ts` - Stop loss automation
- `src/strategies/take-profit.ts` - Take profit automation

### 7. Trade History
Create `src/trade-history.ts`:
```typescript
export class TradeHistory {
  // Record trade
  async recordTrade(order: Order): Promise<void>;
  
  // Get trade history
  async getHistory(filter?: TradeFilter): Promise<Order[]>;
  
  // Get performance metrics
  calculateMetrics(trades: Order[]): PerformanceMetrics;
}
```

## Deliverables

1. **Core managers**:
   - `src/order-manager.ts`
   - `src/risk-manager.ts`
   - `src/position-tracker.ts`
   - `src/portfolio-manager.ts`
   - `src/trade-history.ts`

2. **Strategy system**:
   - `src/strategies/strategy-engine.ts`
   - `src/strategies/buy-hold.ts`
   - `src/strategies/stop-loss.ts`
   - `src/strategies/take-profit.ts`

3. **Main export**:
   - `src/index.ts` - Export all managers
   - `src/trading-bot.ts` - Main orchestrator

4. **Tests**:
   - Unit tests for each manager
   - Integration tests with api-client
   - Strategy backtests

5. **Documentation**:
   - API documentation
   - Strategy guide
   - Risk management rules
   - Examples

## Success Criteria

- [ ] All managers are implemented
- [ ] Order validation works correctly
- [ ] Risk checks prevent invalid trades
- [ ] Position tracking is accurate
- [ ] Portfolio calculations are correct
- [ ] At least 3 strategies implemented
- [ ] Stop-loss automation works
- [ ] Package builds: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Documentation complete

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/trading-service

# Install
npm install

# Build
npm run build

# Test
npm run test

# Watch
npm run watch
```

## Implementation Guidelines

### Risk Management Rules
1. **Position Size Limits**:
   - Max 10% of portfolio per position
   - Max 20% of portfolio per sector

2. **Order Validation**:
   - Check buying power before orders
   - Validate symbol exists
   - Verify market hours (or extended hours flag)
   - Check minimum/maximum order size

3. **Stop Loss**:
   - Default: 5% below entry
   - Configurable per position
   - Automatic execution when triggered

4. **Take Profit**:
   - Default: 10% above entry
   - Configurable per position
   - Automatic execution when triggered

### Portfolio Tracking
- Real-time position updates via WebSocket
- Calculate unrealized P&L
- Track realized P&L from closed positions
- Calculate IRR and other metrics

### Strategy Interface
Each strategy must implement:
```typescript
interface Strategy {
  name: string;
  analyze(data: MarketData): Signal;
  generateOrder(signal: Signal): OrderRequest | null;
}

interface Signal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-1
  reason: string;
}
```

## Notes

- Prioritize safety over speed
- Always validate before executing
- Log all trading decisions
- Implement circuit breakers for errors
- Use dry-run mode for testing
