# Task 5: Implement Telegram Bot

## Package
`packages/telegram-bot`

## Priority
Medium (Phase 3 - After all services are ready)

## Description
Create a Telegram bot interface that allows users to interact with the trading system via chat commands and natural language.

## Dependencies
- `@robinhood-trading/shared-types` ✓
- `@robinhood-trading/utils` ✓
- `@robinhood-trading/api-client` ✓
- `@robinhood-trading/trading-service` ✓

## Reference Documentation
- Telegram integration: `/trading-bot-plans/04-telegram-integration.md`
- Examples: `/trading-bot-plans/09-examples.md`
- Getting started: `/trading-bot-plans/10-getting-started.md`

## Goals

### 1. Bot Setup
Create `src/bot.ts`:
```typescript
import { Bot } from 'grammy';

export class TradingBot {
  private bot: Bot;
  
  constructor(token: string) {
    this.bot = new Bot(token);
    this.setupMiddleware();
    this.setupCommands();
  }
  
  start(): void {
    this.bot.start();
  }
}
```

### 2. Command Handlers
Create `src/commands/` directory with:

**Basic Commands**:
- `/start` - Welcome message and setup
- `/help` - List all commands
- `/status` - Bot status

**Market Data Commands**:
- `/quote AAPL` - Get stock quote
- `/quotes AAPL TSLA MSFT` - Get multiple quotes
- `/chart AAPL` - Get price chart (image)

**Portfolio Commands**:
- `/portfolio` - View portfolio summary
- `/positions` - List all positions
- `/position AAPL` - View specific position
- `/history` - Recent trades

**Trading Commands**:
- `/buy` - Interactive buy flow
- `/sell` - Interactive sell flow
- `/cancel ORDER_ID` - Cancel order
- `/orders` - View pending orders

**Account Commands**:
- `/balance` - Account balance
- `/account` - Account info

### 3. Interactive Keyboards
Create `src/keyboards/`:
```typescript
// Inline keyboards for confirmations
export function createOrderConfirmationKeyboard(order: OrderRequest) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirm', callback_data: `confirm_${order.id}` },
        { text: '❌ Cancel', callback_data: `cancel_${order.id}` }
      ]
    ]
  };
}
```

### 4. Conversation Flows
Create `src/conversations/`:
- `buy-flow.ts` - Step-by-step buy order
- `sell-flow.ts` - Step-by-step sell order
- `alert-flow.ts` - Set price alerts

### 5. Notifications
Create `src/notifications/`:
```typescript
export class NotificationManager {
  // Order notifications
  async notifyOrderFilled(order: Order, userId: string): Promise<void>;
  async notifyOrderCanceled(order: Order, userId: string): Promise<void>;
  
  // Alert notifications
  async notifyPriceAlert(symbol: string, price: number, userId: string): Promise<void>;
  
  // Portfolio notifications
  async notifyDailyPnL(portfolio: Portfolio, userId: string): Promise<void>;
}
```

### 6. Authentication
Create `src/auth/`:
```typescript
export class AuthManager {
  // Verify user is authorized
  isAuthorized(userId: number): boolean;
  
  // Add authorized user
  addAuthorizedUser(userId: number): void;
  
  // Check permissions
  hasPermission(userId: number, action: string): boolean;
}
```

### 7. Message Formatting
Create `src/formatters/`:
```typescript
export function formatQuote(quote: Quote): string;
export function formatPosition(position: Position): string;
export function formatPortfolio(portfolio: Portfolio): string;
export function formatOrder(order: Order): string;
```

### 8. Error Handling
Create `src/error-handler.ts`:
```typescript
export async function handleError(ctx: Context, error: Error): Promise<void> {
  logger.error('Bot error', error);
  await ctx.reply('An error occurred. Please try again.');
}
```

## Deliverables

1. **Core bot**:
   - `src/bot.ts` - Main bot class
   - `src/index.ts` - Entry point with env setup

2. **Command handlers**:
   - `src/commands/market.ts` - Market data commands
   - `src/commands/portfolio.ts` - Portfolio commands
   - `src/commands/trading.ts` - Trading commands
   - `src/commands/account.ts` - Account commands
   - `src/commands/basic.ts` - Basic commands

3. **Features**:
   - `src/keyboards/` - Interactive keyboards
   - `src/conversations/` - Conversation flows
   - `src/notifications/` - Notification system
   - `src/auth/` - Authentication
   - `src/formatters/` - Message formatters
   - `src/error-handler.ts` - Error handling

4. **Configuration**:
   - `.env.example` - Environment variables template
   - `src/config.ts` - Configuration management

5. **Documentation**:
   - Command reference
   - Setup guide
   - User manual
   - Screenshots

## Success Criteria

- [ ] Bot starts successfully
- [ ] All basic commands work
- [ ] Market data commands return quotes
- [ ] Portfolio commands show positions
- [ ] Trading commands place orders
- [ ] Confirmation keyboards work
- [ ] Notifications are sent
- [ ] Authentication blocks unauthorized users
- [ ] Error handling works gracefully
- [ ] Package builds: `npm run build`
- [ ] Bot can be started: `npm run dev`
- [ ] Documentation complete

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/telegram-bot

# Install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your tokens

# Build
npm run build

# Run in dev mode
npm run dev

# Run in production
npm run start
```

## Setup Instructions

### 1. Create Telegram Bot
1. Message @BotFather on Telegram
2. Use `/newbot` command
3. Follow prompts to create bot
4. Save bot token

### 2. Environment Variables
Create `.env`:
```bash
TELEGRAM_BOT_TOKEN=your_bot_token_here
ROBINHOOD_AUTH_TOKEN=Bearer your_token_here
ALLOWED_USER_IDS=123456789,987654321
LOG_LEVEL=info
```

### 3. Get User ID
To find your Telegram user ID:
1. Message @userinfobot
2. It will reply with your user ID
3. Add to ALLOWED_USER_IDS

## Example Commands

```
User: /quote AAPL
Bot: 📈 AAPL - Apple Inc.
     Price: $150.25 (+2.5%)
     Bid/Ask: $150.20 / $150.30
     Volume: 50.2M
     Updated: 2 mins ago

User: /buy
Bot: What symbol would you like to buy?
User: AAPL
Bot: How many shares?
User: 10
Bot: Order preview:
     Buy 10 shares of AAPL at market price
     Est. cost: $1,502.50
     [✅ Confirm] [❌ Cancel]
```

## Implementation Notes

- Use Grammy framework for type-safe bot
- Implement middleware for logging
- Add rate limiting per user
- Cache frequently requested data
- Use inline keyboards for confirmations
- Format numbers with proper locale
- Include emojis for better UX
- Handle long messages with pagination
- Support both commands and natural language
- Implement conversation state management

## Security

- Whitelist authorized user IDs
- Never log sensitive data (tokens, passwords)
- Rate limit commands per user
- Validate all inputs
- Use environment variables for secrets
- Implement command permissions
- Add confirmation for destructive actions
