# Telegram Integration & Clawdbot Connection

## Overview

This document details the integration between the trading bot and Telegram, including the connection to clawdbot (Claude AI) for intelligent trading decisions.

## Architecture

```
User → Telegram → Bot Handler → Clawdbot (Claude) → Trading Actions
                      ↓
                 Trading Client → Robinhood API
```

## Telegram Bot Setup

### 1. Bot Creation

1. Talk to @BotFather on Telegram
2. Use `/newbot` command
3. Choose name and username
4. Save the bot token

### 2. Project Structure

```
telegram-bot/
├── src/
│   ├── bot/
│   │   ├── telegram-bot.ts         # Main bot handler
│   │   ├── command-handler.ts      # Command processing
│   │   ├── message-handler.ts      # Natural language processing
│   │   └── keyboard-builder.ts     # Interactive keyboards
│   ├── clawdbot/
│   │   ├── claude-client.ts        # Claude API client
│   │   ├── mcp-bridge.ts           # MCP integration
│   │   └── context-manager.ts      # Conversation context
│   ├── middleware/
│   │   ├── auth.middleware.ts      # User authentication
│   │   ├── rate-limit.middleware.ts # Rate limiting
│   │   └── logging.middleware.ts   # Request logging
│   └── handlers/
│       ├── trading.handler.ts      # Trading operations
│       ├── portfolio.handler.ts    # Portfolio queries
│       └── alert.handler.ts        # Alert management
```

## Implementation

### 1. Main Telegram Bot

```typescript
// src/bot/telegram-bot.ts
import { Bot, Context, session } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { RobinhoodClient } from 'robinhood-ts-client';
import { ClaudeClient } from '../clawdbot/claude-client';
import { Logger } from '../utils/logger';

export interface BotContext extends Context {
  session: SessionData;
}

export interface SessionData {
  userId: string;
  authToken?: string;
  conversationHistory: Message[];
  pendingOrder?: OrderRequest;
}

export class TradingBot {
  private bot: Bot<BotContext>;
  private robinhoodClient: RobinhoodClient;
  private claudeClient: ClaudeClient;
  private logger: Logger;

  constructor(
    telegramToken: string,
    robinhoodToken: string,
    claudeApiKey: string
  ) {
    this.logger = new Logger('TradingBot');
    this.bot = new Bot<BotContext>(telegramToken);
    this.robinhoodClient = new RobinhoodClient({ authToken: robinhoodToken });
    this.claudeClient = new ClaudeClient(claudeApiKey);

    this.setupMiddleware();
    this.setupCommands();
    this.setupMessageHandlers();
  }

  private setupMiddleware(): void {
    // Session management
    this.bot.use(session({
      initial: (): SessionData => ({
        userId: '',
        conversationHistory: [],
      }),
    }));

    // Conversations plugin
    this.bot.use(conversations());

    // Authentication
    this.bot.use(async (ctx, next) => {
      if (ctx.from) {
        ctx.session.userId = ctx.from.id.toString();
        this.logger.info(`User ${ctx.from.id} (${ctx.from.username})`);
      }
      await next();
    });

    // Error handling
    this.bot.catch((err) => {
      this.logger.error('Bot error:', err);
    });
  }

  private setupCommands(): void {
    // Start command
    this.bot.command('start', async (ctx) => {
      await ctx.reply(
        '🤖 Welcome to Robinhood Trading Bot!\n\n' +
        'I\'m powered by Claude AI and can help you with:\n' +
        '• View portfolio and positions\n' +
        '• Get stock quotes and analysis\n' +
        '• Place trades (buy/sell)\n' +
        '• Set price alerts\n' +
        '• Analyze market trends\n\n' +
        'Type /help to see all commands or just chat naturally!'
      );
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '📚 Available Commands:\n\n' +
        '/portfolio - View your portfolio\n' +
        '/quote <symbol> - Get stock quote\n' +
        '/buy <symbol> <quantity> - Buy stock\n' +
        '/sell <symbol> <quantity> - Sell stock\n' +
        '/positions - View open positions\n' +
        '/orders - View order history\n' +
        '/alerts - Manage price alerts\n' +
        '/analyze <symbol> - Get AI analysis\n' +
        '/balance - Check buying power\n' +
        '/cancel <order_id> - Cancel order\n\n' +
        'Or just ask me anything in natural language!'
      );
    });

    // Portfolio command
    this.bot.command('portfolio', async (ctx) => {
      await this.handlePortfolio(ctx);
    });

    // Quote command
    this.bot.command('quote', async (ctx) => {
      await this.handleQuote(ctx);
    });

    // Buy command
    this.bot.command('buy', async (ctx) => {
      await this.handleBuy(ctx);
    });

    // Sell command
    this.bot.command('sell', async (ctx) => {
      await this.handleSell(ctx);
    });

    // Analyze command
    this.bot.command('analyze', async (ctx) => {
      await this.handleAnalyze(ctx);
    });

    // Balance command
    this.bot.command('balance', async (ctx) => {
      await this.handleBalance(ctx);
    });
  }

  private setupMessageHandlers(): void {
    // Handle natural language messages
    this.bot.on('message:text', async (ctx) => {
      const message = ctx.message.text;

      // Skip if it's a command
      if (message.startsWith('/')) return;

      await this.handleNaturalLanguage(ctx, message);
    });
  }

  /**
   * Handle portfolio request
   */
  private async handlePortfolio(ctx: BotContext): Promise<void> {
    try {
      await ctx.reply('📊 Fetching your portfolio...');

      const accountId = await this.getAccountId();
      const [portfolio, positions] = await Promise.all([
        this.robinhoodClient.trading.getPortfolio(accountId),
        this.robinhoodClient.trading.getPositions(accountId),
      ]);

      // Get Claude to format and analyze
      const analysis = await this.claudeClient.analyzePortfolio(
        portfolio,
        positions
      );

      await ctx.reply(analysis, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Portfolio error:', error);
      await ctx.reply('❌ Failed to fetch portfolio. Please try again.');
    }
  }

  /**
   * Handle quote request
   */
  private async handleQuote(ctx: BotContext): Promise<void> {
    const args = ctx.message?.text.split(' ').slice(1);
    if (!args || args.length === 0) {
      await ctx.reply('❌ Please provide a symbol. Example: /quote AAPL');
      return;
    }

    const symbol = args[0].toUpperCase();

    try {
      await ctx.reply(`📈 Getting quote for ${symbol}...`);

      const quote = await this.robinhoodClient.marketData.getQuote(symbol);

      // Format with Claude
      const formatted = await this.claudeClient.formatQuote(quote);

      await ctx.reply(formatted, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Quote error:', error);
      await ctx.reply(`❌ Failed to get quote for ${symbol}`);
    }
  }

  /**
   * Handle buy request
   */
  private async handleBuy(ctx: BotContext): Promise<void> {
    const args = ctx.message?.text.split(' ').slice(1);
    if (!args || args.length < 2) {
      await ctx.reply(
        '❌ Please provide symbol and quantity. Example: /buy AAPL 10'
      );
      return;
    }

    const symbol = args[0].toUpperCase();
    const quantity = args[1];

    try {
      // Get current quote
      const quote = await this.robinhoodClient.marketData.getQuote(symbol);
      const estimatedCost = parseFloat(quote.last_trade_price) * parseFloat(quantity);

      // Ask for confirmation
      await ctx.reply(
        `🛒 **Order Preview**\n\n` +
        `Symbol: ${symbol}\n` +
        `Action: BUY\n` +
        `Quantity: ${quantity}\n` +
        `Current Price: $${quote.last_trade_price}\n` +
        `Estimated Cost: $${estimatedCost.toFixed(2)}\n\n` +
        `Type /confirm to place order or /cancel to abort`,
        { parse_mode: 'Markdown' }
      );

      // Store pending order in session
      ctx.session.pendingOrder = {
        symbol,
        side: 'buy',
        quantity,
        type: 'market',
        time_in_force: 'gfd',
      };
    } catch (error) {
      this.logger.error('Buy error:', error);
      await ctx.reply('❌ Failed to process buy order');
    }
  }

  /**
   * Handle natural language messages with Claude
   */
  private async handleNaturalLanguage(
    ctx: BotContext,
    message: string
  ): Promise<void> {
    try {
      await ctx.replyWithChatAction('typing');

      // Add to conversation history
      ctx.session.conversationHistory.push({
        role: 'user',
        content: message,
      });

      // Get Claude's response with trading tools
      const response = await this.claudeClient.chat({
        messages: ctx.session.conversationHistory,
        tools: this.getTradingTools(),
      });

      // Handle tool calls
      if (response.toolCalls) {
        for (const toolCall of response.toolCalls) {
          await this.executeTool(ctx, toolCall);
        }
      }

      // Send response
      if (response.content) {
        await ctx.reply(response.content, { parse_mode: 'Markdown' });
        ctx.session.conversationHistory.push({
          role: 'assistant',
          content: response.content,
        });
      }
    } catch (error) {
      this.logger.error('Natural language error:', error);
      await ctx.reply(
        '❌ Sorry, I encountered an error. Please try again or use a specific command.'
      );
    }
  }

  /**
   * Handle analyze request
   */
  private async handleAnalyze(ctx: BotContext): Promise<void> {
    const args = ctx.message?.text.split(' ').slice(1);
    if (!args || args.length === 0) {
      await ctx.reply('❌ Please provide a symbol. Example: /analyze AAPL');
      return;
    }

    const symbol = args[0].toUpperCase();

    try {
      await ctx.reply(`🔍 Analyzing ${symbol}...`);

      // Get market data
      const [quote, historical] = await Promise.all([
        this.robinhoodClient.marketData.getQuote(symbol),
        this.robinhoodClient.marketData.getHistoricalData(symbol, '1d', '1y'),
      ]);

      // Get Claude's analysis
      const analysis = await this.claudeClient.analyzeStock(
        symbol,
        quote,
        historical
      );

      await ctx.reply(analysis, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Analyze error:', error);
      await ctx.reply(`❌ Failed to analyze ${symbol}`);
    }
  }

  /**
   * Handle balance request
   */
  private async handleBalance(ctx: BotContext): Promise<void> {
    try {
      const accountId = await this.getAccountId();
      const account = await this.robinhoodClient.account.getAccount(accountId);

      await ctx.reply(
        `💰 **Account Balance**\n\n` +
        `Buying Power: $${parseFloat(account.buying_power).toFixed(2)}\n` +
        `Cash: $${parseFloat(account.cash).toFixed(2)}\n` +
        `Portfolio Value: $${parseFloat(account.portfolio_value).toFixed(2)}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      this.logger.error('Balance error:', error);
      await ctx.reply('❌ Failed to fetch balance');
    }
  }

  /**
   * Get trading tools for Claude
   */
  private getTradingTools(): Tool[] {
    return [
      {
        name: 'get_quote',
        description: 'Get current quote for a stock symbol',
        input_schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Stock symbol (e.g., AAPL)' },
          },
          required: ['symbol'],
        },
      },
      {
        name: 'get_portfolio',
        description: 'Get user portfolio and positions',
        input_schema: { type: 'object', properties: {} },
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
            type: { type: 'string', enum: ['market', 'limit'] },
            price: { type: 'string' },
          },
          required: ['symbol', 'side', 'quantity', 'type'],
        },
      },
      {
        name: 'get_positions',
        description: 'Get current positions',
        input_schema: { type: 'object', properties: {} },
      },
      {
        name: 'get_historical_data',
        description: 'Get historical price data',
        input_schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string' },
            interval: { type: 'string', enum: ['5m', '15m', '1h', '1d'] },
            span: { type: 'string', enum: ['1d', '1w', '1m', '3m', '1y'] },
          },
          required: ['symbol'],
        },
      },
    ];
  }

  /**
   * Execute trading tool
   */
  private async executeTool(
    ctx: BotContext,
    toolCall: ToolCall
  ): Promise<any> {
    const { name, input } = toolCall;

    switch (name) {
      case 'get_quote':
        return this.robinhoodClient.marketData.getQuote(input.symbol);

      case 'get_portfolio': {
        const accountId = await this.getAccountId();
        return this.robinhoodClient.trading.getPortfolio(accountId);
      }

      case 'place_order': {
        // Require explicit confirmation for trades
        await ctx.reply(
          '⚠️ Claude wants to place an order. Type /confirm to proceed.',
        );
        return { status: 'pending_confirmation' };
      }

      case 'get_positions': {
        const accountId = await this.getAccountId();
        return this.robinhoodClient.trading.getPositions(accountId);
      }

      case 'get_historical_data':
        return this.robinhoodClient.marketData.getHistoricalData(
          input.symbol,
          input.interval || '1d',
          input.span || '1m'
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Get account ID (cached or fetched)
   */
  private async getAccountId(): Promise<string> {
    // This would be cached per user
    const accounts = await this.robinhoodClient.account.getAccounts();
    return accounts[0].id;
  }

  /**
   * Start the bot
   */
  async start(): Promise<void> {
    this.logger.info('Starting Telegram bot...');
    await this.bot.start();
  }

  /**
   * Stop the bot
   */
  async stop(): Promise<void> {
    this.logger.info('Stopping Telegram bot...');
    await this.bot.stop();
  }
}

interface Tool {
  name: string;
  description: string;
  input_schema: object;
}

interface ToolCall {
  name: string;
  input: any;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}
```

### 2. Claude Client

```typescript
// src/clawdbot/claude-client.ts
import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '../utils/logger';

export class ClaudeClient {
  private client: Anthropic;
  private logger: Logger;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.logger = new Logger('ClaudeClient');
  }

  /**
   * Chat with Claude using tool calling
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    try {
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages: options.messages,
        tools: options.tools,
        system: this.getSystemPrompt(),
      });

      // Extract tool calls and content
      const toolCalls: ToolCall[] = [];
      let content = '';

      for (const block of response.content) {
        if (block.type === 'text') {
          content += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            name: block.name,
            input: block.input,
          });
        }
      }

      return { content, toolCalls };
    } catch (error) {
      this.logger.error('Claude API error:', error);
      throw error;
    }
  }

  /**
   * Analyze portfolio with Claude
   */
  async analyzePortfolio(portfolio: any, positions: any[]): Promise<string> {
    const response = await this.chat({
      messages: [
        {
          role: 'user',
          content: `Analyze this portfolio and provide insights:\n\nPortfolio: ${JSON.stringify(portfolio)}\n\nPositions: ${JSON.stringify(positions)}`,
        },
      ],
      tools: [],
    });

    return response.content;
  }

  /**
   * Format quote with Claude
   */
  async formatQuote(quote: any): Promise<string> {
    const response = await this.chat({
      messages: [
        {
          role: 'user',
          content: `Format this stock quote in a user-friendly way:\n${JSON.stringify(quote)}`,
        },
      ],
      tools: [],
    });

    return response.content;
  }

  /**
   * Analyze stock with Claude
   */
  async analyzeStock(
    symbol: string,
    quote: any,
    historical: any[]
  ): Promise<string> {
    const response = await this.chat({
      messages: [
        {
          role: 'user',
          content:
            `Analyze ${symbol} stock:\n\n` +
            `Current Quote: ${JSON.stringify(quote)}\n\n` +
            `Historical Data (last 30 days): ${JSON.stringify(historical.slice(-30))}`,
        },
      ],
      tools: [],
    });

    return response.content;
  }

  /**
   * System prompt for trading assistant
   */
  private getSystemPrompt(): string {
    return `You are a helpful trading assistant integrated with Robinhood. You can:

1. Help users check stock quotes and market data
2. Provide portfolio analysis and insights
3. Execute trades (with user confirmation)
4. Set up price alerts
5. Analyze market trends

When discussing trades:
- Always be clear about risks
- Never give financial advice
- Require explicit confirmation before placing orders
- Provide context about market conditions

Format responses using Markdown for better readability.
Use emojis appropriately to make responses more engaging.

Remember: You're assisting with trades, not providing financial advice.`;
  }
}

interface ChatOptions {
  messages: Message[];
  tools: Tool[];
}

interface ChatResponse {
  content: string;
  toolCalls: ToolCall[];
}
```

## Channel Setup for Clawdbot

To connect via Telegram channel:

```typescript
// Add bot to channel as admin
// Configure channel for bot commands

export class ChannelBotManager {
  private bot: Bot;

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Setup channel-specific handlers
   */
  setupChannelHandlers(channelId: string): void {
    // Handle channel posts
    this.bot.on('channel_post', async (ctx) => {
      if (ctx.channelPost.sender_chat?.id.toString() === channelId) {
        await this.processChannelMessage(ctx);
      }
    });
  }

  private async processChannelMessage(ctx: Context): Promise<void> {
    // Process messages from channel
    // Could be market updates, alerts, etc.
  }
}
```

## Security Considerations

1. **User Authentication**: Verify Telegram user IDs
2. **Rate Limiting**: Prevent abuse
3. **Trade Confirmation**: Always require confirmation for trades
4. **Sensitive Data**: Never log auth tokens or personal data
5. **Access Control**: Whitelist authorized users

## Deployment

```bash
# Environment variables
TELEGRAM_BOT_TOKEN=your-bot-token
ROBINHOOD_AUTH_TOKEN=your-rh-token
CLAUDE_API_KEY=your-claude-key
ALLOWED_USER_IDS=123456,789012

# Start bot
npm run start:bot
```

## Next Steps

1. Implement [MCP Integration](./05-mcp-integration.md) for advanced agent features
2. Add [Caching and Rate Limiting](./07-caching-rate-limiting.md)
3. Set up [Authentication](./06-authentication.md)
4. Deploy following [Deployment Guide](./08-deployment.md)
