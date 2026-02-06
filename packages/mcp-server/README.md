# @robinhood-trading/mcp-server

Model Context Protocol (MCP) server for AI agent integration with Robinhood trading.

## Purpose

This package implements an MCP server that exposes trading tools to AI agents like Claude:
- Tool registration for trading actions
- Context management for conversations
- Agent orchestration
- Structured data exchange

## MCP Tools

- `execute_trade` - Place buy/sell orders
- `get_portfolio` - Get portfolio summary
- `get_position` - Get position for a symbol
- `get_quote` - Get real-time quote
- `get_account_balance` - Get account balance
- `set_alert` - Set price alerts
- `get_trade_history` - Get historical trades

## Agent Task

This package can be worked on independently by agents focusing on:
- Implementing MCP protocol specification
- Creating tool definitions
- Adding context management
- Building agent communication layer
- Implementing tool handlers
- Adding security and validation

## Development

```bash
npm run dev
```

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
