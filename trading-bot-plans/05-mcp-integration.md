# Model Context Protocol (MCP) Integration

## Overview

The Model Context Protocol (MCP) enables standardized communication between AI agents and external tools/services. This document outlines how to integrate MCP into the trading bot for advanced agent orchestration.

## What is MCP?

MCP is an open protocol that standardizes how applications provide context to AI models. For our trading bot, MCP allows Claude (via clawdbot) to:

- Access trading tools in a standardized way
- Maintain conversation context
- Coordinate multiple agents
- Execute complex workflows

## Architecture

```
Telegram User
     ↓
Telegram Bot Handler
     ↓
MCP Server (Trading Bot)
     ├── Tool Registry
     ├── Resource Manager
     └── Context Store
     ↓
Claude AI (MCP Client)
     ↓
Trading Actions
```

## MCP Server Implementation

```typescript
// src/mcp/mcp-server.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { RobinhoodClient } from '../client/robinhood-client';

export class TradingMCPServer {
  private server: Server;
  private robinhoodClient: RobinhoodClient;

  constructor(robinhoodClient: RobinhoodClient) {
    this.robinhoodClient = robinhoodClient;
    
    this.server = new Server(
      {
        name: 'robinhood-trading-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupTools();
    this.setupResources();
  }

  private setupTools(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_quote',
            description: 'Get current stock quote',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: {
                  type: 'string',
                  description: 'Stock symbol (e.g., AAPL)',
                },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'place_order',
            description: 'Place a trading order',
            inputSchema: {
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
            name: 'get_portfolio',
            description: 'Get portfolio summary',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_positions',
            description: 'Get current positions',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'cancel_order',
            description: 'Cancel an existing order',
            inputSchema: {
              type: 'object',
              properties: {
                order_id: { type: 'string' },
              },
              required: ['order_id'],
            },
          },
          {
            name: 'get_account_balance',
            description: 'Get account balance and buying power',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_historical_data',
            description: 'Get historical price data',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                interval: { type: 'string', enum: ['5m', '15m', '1h', '1d'] },
                span: { type: 'string', enum: ['1d', '1w', '1m', '3m', '1y'] },
              },
              required: ['symbol'],
            },
          },
          {
            name: 'set_alert',
            description: 'Set a price alert',
            inputSchema: {
              type: 'object',
              properties: {
                symbol: { type: 'string' },
                condition: { type: 'string', enum: ['above', 'below'] },
                price: { type: 'string' },
              },
              required: ['symbol', 'condition', 'price'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_quote':
          return await this.handleGetQuote(args.symbol);

        case 'place_order':
          return await this.handlePlaceOrder(args);

        case 'get_portfolio':
          return await this.handleGetPortfolio();

        case 'get_positions':
          return await this.handleGetPositions();

        case 'cancel_order':
          return await this.handleCancelOrder(args.order_id);

        case 'get_account_balance':
          return await this.handleGetBalance();

        case 'get_historical_data':
          return await this.handleGetHistoricalData(args);

        case 'set_alert':
          return await this.handleSetAlert(args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private async handleGetQuote(symbol: string) {
    const quote = await this.robinhoodClient.marketData.getQuote(symbol);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(quote, null, 2),
        },
      ],
    };
  }

  private async handlePlaceOrder(args: any) {
    const accountId = await this.getAccountId();
    const order = await this.robinhoodClient.trading.placeOrder({
      account: accountId,
      ...args,
    });
    return {
      content: [
        {
          type: 'text',
          text: `Order placed: ${JSON.stringify(order, null, 2)}`,
        },
      ],
    };
  }

  private async handleGetPortfolio() {
    const accountId = await this.getAccountId();
    const portfolio = await this.robinhoodClient.trading.getPortfolio(accountId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(portfolio, null, 2),
        },
      ],
    };
  }

  private async handleGetPositions() {
    const accountId = await this.getAccountId();
    const positions = await this.robinhoodClient.trading.getPositions(accountId);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(positions, null, 2),
        },
      ],
    };
  }

  private async handleCancelOrder(orderId: string) {
    const order = await this.robinhoodClient.trading.cancelOrder(orderId);
    return {
      content: [
        {
          type: 'text',
          text: `Order cancelled: ${JSON.stringify(order, null, 2)}`,
        },
      ],
    };
  }

  private async handleGetBalance() {
    const accountId = await this.getAccountId();
    const account = await this.robinhoodClient.account.getAccount(accountId);
    return {
      content: [
        {
          type: 'text',
          text: `Balance: $${account.buying_power}`,
        },
      ],
    };
  }

  private async handleGetHistoricalData(args: any) {
    const data = await this.robinhoodClient.marketData.getHistoricalData(
      args.symbol,
      args.interval || '1d',
      args.span || '1m'
    );
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }

  private async handleSetAlert(args: any) {
    // Implementation for alert system
    return {
      content: [
        {
          type: 'text',
          text: `Alert set for ${args.symbol} ${args.condition} $${args.price}`,
        },
      ],
    };
  }

  private async getAccountId(): Promise<string> {
    const accounts = await this.robinhoodClient.account.getAccounts();
    return accounts[0].id;
  }

  private setupResources(): void {
    // Resources could include portfolio state, watchlists, etc.
    // Implementation similar to tools
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('MCP Server started');
  }
}
```

## MCP Client Integration

```typescript
// src/mcp/mcp-bridge.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPBridge {
  private client: Client;

  async connect() {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['dist/mcp/mcp-server.js'],
    });

    this.client = new Client(
      {
        name: 'trading-bot-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await this.client.connect(transport);
  }

  async callTool(name: string, args: any) {
    return this.client.request(
      {
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      },
      { timeout: 30000 }
    );
  }

  async listTools() {
    return this.client.request(
      {
        method: 'tools/list',
      },
      {}
    );
  }
}
```

## Usage with Claude

```typescript
// Integrate MCP with Claude conversations
import { ClaudeClient } from './claude-client';
import { MCPBridge } from './mcp-bridge';

export class ClaudeWithMCP {
  constructor(
    private claude: ClaudeClient,
    private mcp: MCPBridge
  ) {}

  async chat(message: string) {
    // Get available tools from MCP
    const tools = await this.mcp.listTools();

    // Send to Claude with MCP tools
    const response = await this.claude.chat({
      messages: [{ role: 'user', content: message }],
      tools: tools.tools,
    });

    // Execute tool calls via MCP
    if (response.toolCalls) {
      for (const call of response.toolCalls) {
        const result = await this.mcp.callTool(call.name, call.input);
        // Continue conversation with results...
      }
    }

    return response;
  }
}
```

## Configuration

```json
// mcp-config.json
{
  "mcpServers": {
    "robinhood-trading": {
      "command": "node",
      "args": ["dist/mcp/mcp-server.js"],
      "env": {
        "ROBINHOOD_AUTH_TOKEN": "${ROBINHOOD_AUTH_TOKEN}"
      }
    }
  }
}
```

## Benefits of MCP Integration

1. **Standardized Interface**: Claude can interact with trading tools in a consistent way
2. **Multi-Agent Coordination**: Multiple AI agents can access the same tools
3. **Context Management**: MCP handles conversation state and context
4. **Tool Discovery**: Agents can discover available tools dynamically
5. **Security**: MCP provides a controlled interface for tool execution

## Next Steps

1. Review [Authentication Strategy](./06-authentication.md)
2. Implement [Caching and Rate Limiting](./07-caching-rate-limiting.md)
3. Plan [Deployment](./08-deployment.md)
