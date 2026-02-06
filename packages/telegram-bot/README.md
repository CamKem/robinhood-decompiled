# @robinhood-trading/telegram-bot

Telegram bot interface for the Robinhood trading system.

## Purpose

This package provides a Telegram bot interface for users to:
- Execute trades via chat commands
- Get real-time quotes and market data
- View portfolio and positions
- Receive trade notifications
- Interact with Claude AI for trading decisions

## Agent Task

This package can be worked on independently by agents focusing on:
- Implementing bot commands (/buy, /sell, /quote, /portfolio)
- Creating interactive keyboards
- Adding user authentication
- Implementing notification system
- Creating conversation flows
- Adding natural language processing

## Development

```bash
# Set up .env file with:
# TELEGRAM_BOT_TOKEN=your_token_here
# ROBINHOOD_AUTH_TOKEN=Bearer your_token_here

npm run dev
```

## Commands

- `/start` - Initialize bot
- `/quote SYMBOL` - Get stock quote
- `/buy` - Place buy order
- `/sell` - Place sell order
- `/portfolio` - View portfolio
- `/positions` - View positions
- `/orders` - View order history
- `/help` - Show help
