# Task 6: Create MCP Server

## Package
`packages/mcp-server`

## Priority
Low (Phase 3 - Optional advanced feature)

## Description
Implement a Model Context Protocol (MCP) server that exposes trading tools to AI agents like Claude, enabling AI-powered trading decisions and natural language interaction.

## Dependencies
- `@robinhood-trading/shared-types` ✓
- `@robinhood-trading/utils` ✓
- `@robinhood-trading/api-client` ✓
- `@robinhood-trading/trading-service` ✓

## Reference Documentation
- MCP integration: `/trading-bot-plans/05-mcp-integration.md`
- Architecture: `/trading-bot-plans/01-architecture-overview.md`
- MCP Spec: https://modelcontextprotocol.io/

## Goals

### 1. MCP Server Setup
Create `src/server.ts`:
```typescript
import { MCPServer } from '@modelcontextprotocol/sdk';

export class RobinhoodMCPServer {
  private server: MCPServer;
  
  constructor() {
    this.server = new MCPServer({
      name: 'robinhood-trading',
      version: '1.0.0'
    });
    
    this.registerTools();
    this.registerResources();
  }
  
  start(): void {
    this.server.listen();
  }
}
```

### 2. Trading Tools
Create `src/tools/` with MCP tool definitions:

**execute_trade**:
```typescript
{
  name: 'execute_trade',
  description: 'Place a buy or sell order',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string' },
      side: { type: 'string', enum: ['buy', 'sell'] },
      quantity: { type: 'number' },
      type: { type: 'string', enum: ['market', 'limit'] },
      price: { type: 'number', optional: true }
    },
    required: ['symbol', 'side', 'quantity', 'type']
  }
}
```

**get_quote**:
```typescript
{
  name: 'get_quote',
  description: 'Get real-time stock quote',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string' }
    },
    required: ['symbol']
  }
}
```

**get_portfolio**:
```typescript
{
  name: 'get_portfolio',
  description: 'Get current portfolio with all positions',
  inputSchema: { type: 'object', properties: {} }
}
```

**get_position**:
```typescript
{
  name: 'get_position',
  description: 'Get position for a specific symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string' }
    },
    required: ['symbol']
  }
}
```

**get_account_balance**:
```typescript
{
  name: 'get_account_balance',
  description: 'Get account balance and buying power',
  inputSchema: { type: 'object', properties: {} }
}
```

**set_alert**:
```typescript
{
  name: 'set_alert',
  description: 'Set a price alert for a symbol',
  inputSchema: {
    type: 'object',
    properties: {
      symbol: { type: 'string' },
      condition: { type: 'string', enum: ['above', 'below'] },
      price: { type: 'number' }
    },
    required: ['symbol', 'condition', 'price']
  }
}
```

**get_trade_history**:
```typescript
{
  name: 'get_trade_history',
  description: 'Get historical trades',
  inputSchema: {
    type: 'object',
    properties: {
      startDate: { type: 'string' },
      endDate: { type: 'string' },
      symbol: { type: 'string', optional: true }
    }
  }
}
```

### 3. Tool Handlers
Create `src/handlers/`:
```typescript
export class ToolHandlers {
  constructor(
    private tradingService: TradingService,
    private apiClient: HttpClient
  ) {}
  
  async handleExecuteTrade(params: any): Promise<MCPResponse> {
    // Validate params
    // Call trading service
    // Return structured response
  }
  
  async handleGetQuote(params: any): Promise<MCPResponse> {
    // Get quote from API
    // Format response
  }
  
  // ... other handlers
}
```

### 4. Context Management
Create `src/context/`:
```typescript
export class ContextManager {
  // Store conversation context
  private contexts: Map<string, ConversationContext>;
  
  // Add context for session
  addContext(sessionId: string, context: any): void;
  
  // Get context
  getContext(sessionId: string): ConversationContext | null;
  
  // Clear old contexts
  cleanup(): void;
}
```

### 5. Resources
Create `src/resources/`:
```typescript
// MCP resources for providing context to AI
export const resources = [
  {
    uri: 'robinhood://portfolio',
    name: 'Current Portfolio',
    description: 'User\'s current portfolio and positions',
    mimeType: 'application/json'
  },
  {
    uri: 'robinhood://account',
    name: 'Account Information',
    description: 'Account balance and buying power',
    mimeType: 'application/json'
  }
];
```

### 6. Validation & Security
Create `src/validators/`:
```typescript
export class MCPValidator {
  // Validate tool parameters
  validateToolParams(tool: string, params: any): ValidationResult;
  
  // Check permissions
  checkPermissions(userId: string, tool: string): boolean;
  
  // Rate limiting
  async checkRateLimit(userId: string): Promise<boolean>;
}
```

### 7. Response Formatting
Create `src/formatters/`:
```typescript
export class MCPFormatter {
  // Format successful response
  formatSuccess(data: any): MCPResponse;
  
  // Format error response
  formatError(error: Error): MCPResponse;
  
  // Format tool result
  formatToolResult(tool: string, result: any): MCPToolResult;
}
```

## Deliverables

1. **Core server**:
   - `src/server.ts` - MCP server implementation
   - `src/index.ts` - Entry point

2. **Tools**:
   - `src/tools/trading-tools.ts` - Trading tool definitions
   - `src/tools/market-data-tools.ts` - Market data tools
   - `src/tools/account-tools.ts` - Account tools

3. **Handlers**:
   - `src/handlers/tool-handlers.ts` - Tool execution handlers
   - `src/handlers/resource-handlers.ts` - Resource handlers

4. **Features**:
   - `src/context/context-manager.ts` - Context management
   - `src/validators/mcp-validator.ts` - Validation
   - `src/formatters/mcp-formatter.ts` - Response formatting

5. **Documentation**:
   - Tool reference
   - Integration guide
   - Examples with Claude
   - Architecture diagram

## Success Criteria

- [ ] MCP server starts successfully
- [ ] All tools are registered
- [ ] Tool handlers execute correctly
- [ ] Responses follow MCP format
- [ ] Context is maintained across calls
- [ ] Validation prevents invalid operations
- [ ] Security checks work
- [ ] Package builds: `npm run build`
- [ ] Server runs: `npm run start`
- [ ] Can integrate with Claude
- [ ] Documentation complete

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/mcp-server

# Install
npm install

# Build
npm run build

# Run
npm run start

# Dev mode
npm run dev
```

## MCP Integration with Claude

### Client Configuration
Create `~/.config/claude/mcp-config.json`:
```json
{
  "mcpServers": {
    "robinhood-trading": {
      "command": "node",
      "args": [
        "/path/to/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "ROBINHOOD_AUTH_TOKEN": "Bearer your_token"
      }
    }
  }
}
```

### Example Conversation
```
User: What's my portfolio looking like?
Claude: [Uses get_portfolio tool]
        Your portfolio has a total value of $10,250...

User: Buy 10 shares of AAPL
Claude: [Uses get_quote tool to check price]
        [Uses execute_trade tool]
        I've placed a market order to buy 10 shares of AAPL...
```

## Implementation Notes

### MCP Protocol
- Request/response based
- JSON-RPC 2.0 format
- Stdio transport (stdin/stdout)
- Structured tool definitions
- Context passing

### Tool Design
- Clear descriptions for AI understanding
- Strict input validation
- Structured output
- Error handling
- Rate limiting

### Security
- Validate all inputs
- Check permissions per tool
- Rate limit per user/session
- Log all tool executions
- Sanitize outputs

### Context Management
- Store session state
- Track conversation history
- Maintain user preferences
- Clean up old sessions

## Testing

Create example scripts:
```typescript
// test/execute-trade.ts
const client = new MCPClient();
const result = await client.callTool('execute_trade', {
  symbol: 'AAPL',
  side: 'buy',
  quantity: 1,
  type: 'market'
});
console.log(result);
```

## References

- MCP Specification: https://modelcontextprotocol.io/
- Claude MCP Guide: https://docs.anthropic.com/mcp
- Example MCP servers: https://github.com/anthropics/mcp-servers
