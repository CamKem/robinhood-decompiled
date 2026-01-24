# Code Examples

## Quick Start Examples

### Example 1: Basic Quote Retrieval

```typescript
import { RobinhoodClient } from 'robinhood-ts-client';

async function getQuote() {
  const client = new RobinhoodClient({
    authToken: process.env.ROBINHOOD_AUTH_TOKEN,
  });

  const quote = await client.marketData.getQuote('AAPL');
  
  console.log(`AAPL Price: $${quote.last_trade_price}`);
  console.log(`Change: ${quote.change_percentage}%`);
}

getQuote().catch(console.error);
```

### Example 2: Place Market Order

```typescript
async function placeMarketOrder() {
  const client = new RobinhoodClient({
    authToken: process.env.ROBINHOOD_AUTH_TOKEN,
  });

  // Get account ID
  const accounts = await client.account.getAccounts();
  const accountId = accounts[0].id;

  // Get instrument URL
  const instruments = await client.marketData.getInstrumentBySymbol('TSLA');
  const instrumentUrl = instruments[0].url;

  // Place order
  const order = await client.trading.placeOrder({
    account: accountId,
    instrument: instrumentUrl,
    symbol: 'TSLA',
    type: 'market',
    side: 'buy',
    quantity: '1',
    time_in_force: 'gfd',
  });

  console.log(`Order placed: ${order.id}`);
  console.log(`Status: ${order.state}`);
}
```

### Example 3: Get Portfolio Summary

```typescript
async function getPortfolio() {
  const client = new RobinhoodClient({
    authToken: process.env.ROBINHOOD_AUTH_TOKEN,
  });

  const accounts = await client.account.getAccounts();
  const accountId = accounts[0].id;

  const [portfolio, positions] = await Promise.all([
    client.trading.getPortfolio(accountId),
    client.trading.getPositions(accountId),
  ]);

  console.log('\n📊 Portfolio Summary\n');
  console.log(`Total Value: $${portfolio.equity}`);
  console.log(`Cash: $${portfolio.withdrawable_amount}`);
  console.log(`\nPositions: ${positions.length}`);
  
  for (const position of positions) {
    const quantity = parseFloat(position.quantity);
    if (quantity > 0) {
      console.log(`- ${position.symbol}: ${quantity} shares`);
    }
  }
}
```

## Telegram Bot Examples

### Example 4: Simple Telegram Bot

```typescript
import { Bot } from 'grammy';
import { RobinhoodClient } from 'robinhood-ts-client';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const rhClient = new RobinhoodClient({
  authToken: process.env.ROBINHOOD_AUTH_TOKEN,
});

// Quote command
bot.command('quote', async (ctx) => {
  const symbol = ctx.match?.toString().toUpperCase();
  
  if (!symbol) {
    await ctx.reply('Usage: /quote SYMBOL');
    return;
  }

  try {
    const quote = await rhClient.marketData.getQuote(symbol);
    
    await ctx.reply(
      `📈 ${symbol}\n\n` +
      `Price: $${quote.last_trade_price}\n` +
      `Change: ${quote.change_percentage}%\n` +
      `Volume: ${quote.volume}`
    );
  } catch (error) {
    await ctx.reply(`❌ Failed to get quote for ${symbol}`);
  }
});

// Portfolio command
bot.command('portfolio', async (ctx) => {
  const accounts = await rhClient.account.getAccounts();
  const portfolio = await rhClient.trading.getPortfolio(accounts[0].id);
  
  await ctx.reply(
    `💰 Portfolio\n\n` +
    `Value: $${portfolio.equity}\n` +
    `Cash: $${portfolio.withdrawable_amount}\n` +
    `P&L Today: $${portfolio.equity_previous_close}`
  );
});

bot.start();
```

### Example 5: Interactive Order Flow

```typescript
import { Bot, InlineKeyboard } from 'grammy';

bot.command('buy', async (ctx) => {
  const args = ctx.match?.toString().split(' ');
  const symbol = args?.[0]?.toUpperCase();
  const quantity = args?.[1];

  if (!symbol || !quantity) {
    await ctx.reply('Usage: /buy SYMBOL QUANTITY');
    return;
  }

  // Get quote
  const quote = await rhClient.marketData.getQuote(symbol);
  const estimatedCost = parseFloat(quote.last_trade_price) * parseFloat(quantity);

  // Create confirmation keyboard
  const keyboard = new InlineKeyboard()
    .text('✅ Confirm', `confirm_buy:${symbol}:${quantity}`)
    .text('❌ Cancel', 'cancel_order');

  await ctx.reply(
    `🛒 Order Preview\n\n` +
    `Symbol: ${symbol}\n` +
    `Quantity: ${quantity}\n` +
    `Price: $${quote.last_trade_price}\n` +
    `Est. Cost: $${estimatedCost.toFixed(2)}\n\n` +
    `Confirm this order?`,
    { reply_markup: keyboard }
  );
});

// Handle confirmation
bot.callbackQuery(/confirm_buy:(.+):(.+)/, async (ctx) => {
  const [, symbol, quantity] = ctx.match;

  try {
    await ctx.answerCallbackQuery({ text: 'Placing order...' });

    const accounts = await rhClient.account.getAccounts();
    const instruments = await rhClient.marketData.getInstrumentBySymbol(symbol);

    const order = await rhClient.trading.placeOrder({
      account: accounts[0].id,
      instrument: instruments[0].url,
      symbol,
      type: 'market',
      side: 'buy',
      quantity,
      time_in_force: 'gfd',
    });

    await ctx.editMessageText(
      `✅ Order Placed!\n\n` +
      `Order ID: ${order.id}\n` +
      `Status: ${order.state}`
    );
  } catch (error) {
    await ctx.editMessageText('❌ Failed to place order');
  }
});

bot.callbackQuery('cancel_order', async (ctx) => {
  await ctx.answerCallbackQuery({ text: 'Order cancelled' });
  await ctx.editMessageText('Order cancelled');
});
```

## Claude AI Integration Examples

### Example 6: Claude with Trading Tools

```typescript
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

async function chatWithClaude(message: string) {
  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{ role: 'user', content: message }],
    tools: [
      {
        name: 'get_quote',
        description: 'Get current stock quote',
        input_schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'place_order',
        description: 'Place a trading order',
        input_schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            side: { type: 'string', enum: ['buy', 'sell'] },
            quantity: { type: 'string' },
          },
          required: ['symbol', 'side', 'quantity'],
        },
      },
    ],
  });

  // Handle tool calls
  for (const block of response.content) {
    if (block.type === 'tool_use') {
      console.log(`Claude wants to use tool: ${block.name}`);
      console.log(`With inputs:`, block.input);

      // Execute tool
      if (block.name === 'get_quote') {
        const quote = await rhClient.marketData.getQuote(block.input.symbol);
        console.log(`Quote:`, quote);
      }
    } else if (block.type === 'text') {
      console.log(`Claude says: ${block.text}`);
    }
  }
}

// Example: "What's the price of AAPL?"
chatWithClaude('What's the price of AAPL?');
```

### Example 7: Portfolio Analysis with Claude

```typescript
async function analyzePortfolio() {
  const accounts = await rhClient.account.getAccounts();
  const [portfolio, positions] = await Promise.all([
    rhClient.trading.getPortfolio(accounts[0].id),
    rhClient.trading.getPositions(accounts[0].id),
  ]);

  const response = await claude.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: 
          `Analyze this portfolio and provide insights:\n\n` +
          `Portfolio Value: $${portfolio.equity}\n` +
          `Positions:\n${JSON.stringify(positions, null, 2)}`,
      },
    ],
  });

  const analysis = response.content[0].type === 'text' 
    ? response.content[0].text 
    : '';

  console.log('Portfolio Analysis:\n', analysis);
}
```

## WebSocket Real-Time Data

### Example 8: Real-Time Quote Stream

```typescript
import WebSocket from 'ws';

class RobinhoodWebSocket {
  private ws: WebSocket;

  connect(symbols: string[]) {
    this.ws = new WebSocket('wss://api.robinhood.com/stream/');

    this.ws.on('open', () => {
      console.log('WebSocket connected');
      
      // Subscribe to symbols
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        service: 'market_data',
        symbols: symbols,
      }));
    });

    this.ws.on('message', (data) => {
      const update = JSON.parse(data.toString());
      console.log('Price update:', update);
    });

    this.ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  disconnect() {
    this.ws.close();
  }
}

// Usage
const wsClient = new RobinhoodWebSocket();
wsClient.connect(['AAPL', 'TSLA', 'GOOGL']);
```

## Advanced Examples

### Example 9: Automated Trading Strategy

```typescript
class SimpleMovingAverageStrategy {
  private rhClient: RobinhoodClient;
  private symbol: string;
  private shortPeriod: number = 5;
  private longPeriod: number = 20;

  constructor(client: RobinhoodClient, symbol: string) {
    this.rhClient = client;
    this.symbol = symbol;
  }

  async execute() {
    // Get historical data
    const historical = await this.rhClient.marketData.getHistoricalData(
      this.symbol,
      '1d',
      '1m'
    );

    // Calculate moving averages
    const shortMA = this.calculateMA(historical, this.shortPeriod);
    const longMA = this.calculateMA(historical, this.longPeriod);

    // Generate signal
    if (shortMA > longMA) {
      console.log(`BUY signal for ${this.symbol}`);
      // Place buy order
    } else if (shortMA < longMA) {
      console.log(`SELL signal for ${this.symbol}`);
      // Place sell order
    }
  }

  private calculateMA(data: any[], period: number): number {
    const recent = data.slice(-period);
    const sum = recent.reduce((acc, d) => acc + parseFloat(d.close_price), 0);
    return sum / period;
  }
}

// Usage
const strategy = new SimpleMovingAverageStrategy(rhClient, 'AAPL');
setInterval(() => strategy.execute(), 60000); // Run every minute
```

### Example 10: Multi-Account Management

```typescript
class MultiAccountManager {
  private clients: Map<string, RobinhoodClient> = new Map();

  addAccount(userId: string, authToken: string) {
    this.clients.set(userId, new RobinhoodClient({ authToken }));
  }

  async executeForAll(action: (client: RobinhoodClient) => Promise<void>) {
    const promises = Array.from(this.clients.values()).map(client => 
      action(client).catch(error => {
        console.error('Error executing action:', error);
      })
    );

    await Promise.all(promises);
  }

  async getPortfolio(userId: string) {
    const client = this.clients.get(userId);
    if (!client) throw new Error('User not found');

    const accounts = await client.account.getAccounts();
    return client.trading.getPortfolio(accounts[0].id);
  }
}

// Usage
const manager = new MultiAccountManager();
manager.addAccount('user1', process.env.USER1_TOKEN!);
manager.addAccount('user2', process.env.USER2_TOKEN!);

// Get quotes for all accounts
await manager.executeForAll(async (client) => {
  const quote = await client.marketData.getQuote('AAPL');
  console.log('AAPL:', quote.last_trade_price);
});
```

### Example 11: Error Handling and Retry Logic

```typescript
class ResilientTrading {
  private maxRetries = 3;
  private retryDelay = 1000;

  async placeOrderWithRetry(orderRequest: OrderRequest): Promise<Order> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const order = await rhClient.trading.placeOrder(orderRequest);
        console.log(`Order placed successfully on attempt ${attempt}`);
        return order;
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt} failed:`, error);

        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError!.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Example 12: Complete Trading Bot

```typescript
// Complete bot with all features
import { Bot } from 'grammy';
import { RobinhoodClient } from 'robinhood-ts-client';
import Anthropic from '@anthropic-ai/sdk';

class TradingBot {
  private bot: Bot;
  private rhClient: RobinhoodClient;
  private claude: Anthropic;

  constructor() {
    this.bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
    this.rhClient = new RobinhoodClient({
      authToken: process.env.ROBINHOOD_AUTH_TOKEN,
      enableCache: true,
    });
    this.claude = new Anthropic({
      apiKey: process.env.CLAUDE_API_KEY,
    });

    this.setupCommands();
    this.setupMessageHandler();
  }

  private setupCommands() {
    this.bot.command('start', (ctx) => 
      ctx.reply('Welcome to the Trading Bot!')
    );

    this.bot.command('quote', async (ctx) => {
      const symbol = ctx.match?.toString().toUpperCase();
      if (!symbol) {
        await ctx.reply('Usage: /quote SYMBOL');
        return;
      }

      const quote = await this.rhClient.marketData.getQuote(symbol);
      await ctx.reply(
        `📈 ${symbol}: $${quote.last_trade_price} (${quote.change_percentage}%)`
      );
    });

    this.bot.command('portfolio', async (ctx) => {
      const accounts = await this.rhClient.account.getAccounts();
      const portfolio = await this.rhClient.trading.getPortfolio(accounts[0].id);
      
      await ctx.reply(
        `💰 Portfolio Value: $${portfolio.equity}\n` +
        `Cash: $${portfolio.withdrawable_amount}`
      );
    });
  }

  private setupMessageHandler() {
    this.bot.on('message:text', async (ctx) => {
      if (ctx.message.text.startsWith('/')) return;

      // Use Claude for natural language
      const response = await this.claude.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [{ role: 'user', content: ctx.message.text }],
      });

      const text = response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Sorry, I couldn\'t process that.';

      await ctx.reply(text);
    });
  }

  start() {
    this.bot.start();
    console.log('Bot started!');
  }
}

// Start the bot
const bot = new TradingBot();
bot.start();
```

## Testing Examples

### Example 13: Unit Test

```typescript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { RobinhoodClient } from 'robinhood-ts-client';

describe('RobinhoodClient', () => {
  let client: RobinhoodClient;

  beforeEach(() => {
    client = new RobinhoodClient({
      authToken: 'test-token',
    });
  });

  it('should get quote', async () => {
    const quote = await client.marketData.getQuote('AAPL');
    
    expect(quote).toHaveProperty('last_trade_price');
    expect(quote).toHaveProperty('symbol');
    expect(quote.symbol).toBe('AAPL');
  });

  it('should handle errors gracefully', async () => {
    await expect(
      client.marketData.getQuote('INVALID')
    ).rejects.toThrow();
  });
});
```

## Next Steps

1. Review [Getting Started Guide](./10-getting-started.md)
2. Modify examples for your use case
3. Test thoroughly before using real money
4. Start with small positions
5. Monitor and iterate
