# Monorepo Development Guide

This repository has been transformed into a monorepo to enable parallel development by multiple agent instances. Each package can be developed independently while sharing common dependencies and types.

## Architecture

```
robinhood-decompiled/
├── packages/                       # All TypeScript packages
│   ├── shared-types/              # Common types (Phase 1)
│   ├── utils/                     # Shared utilities (Phase 1)
│   ├── api-client/                # API client (Phase 2)
│   ├── trading-service/           # Trading logic (Phase 2)
│   ├── telegram-bot/              # Telegram interface (Phase 3)
│   └── mcp-server/                # MCP integration (Phase 3)
├── app/                           # Original decompiled app
├── audit/                         # Audit bundle
├── trading-bot-plans/             # Implementation plans
└── .github/agent-tasks/           # Agent task definitions
```

## Quick Start

### Install Dependencies

```bash
# Install all packages
npm install

# This will install dependencies for all workspace packages
```

### Build All Packages

```bash
# Build everything
npm run build

# Build specific package
npm run build --workspace=packages/api-client
```

### Development

```bash
# Watch mode for specific package
cd packages/api-client
npm run watch

# Run telegram bot in dev mode
npm run dev --workspace=packages/telegram-bot
```

## Package Overview

### 1. shared-types
**Purpose**: Common TypeScript types and interfaces  
**Dependencies**: None  
**Can start**: Immediately (Phase 1)

Core types for:
- Trading (orders, positions, quotes)
- Accounts
- API responses
- WebSocket messages

### 2. utils
**Purpose**: Shared utilities and helpers  
**Dependencies**: None  
**Can start**: Immediately (Phase 1)

Utilities for:
- Logging
- Caching
- Rate limiting
- Retry logic
- Validation
- Formatting

### 3. api-client
**Purpose**: TypeScript API client for Robinhood  
**Dependencies**: shared-types, utils  
**Can start**: After Phase 1

Services:
- HTTP client with retry
- Trading service (equity orders)
- Market data service
- Account service
- Crypto service
- Options service
- WebSocket manager

### 4. trading-service
**Purpose**: Core trading logic and strategy engine  
**Dependencies**: shared-types, utils, api-client  
**Can start**: After api-client

Components:
- Order manager
- Risk manager
- Position tracker
- Portfolio manager
- Strategy engine
- Trade history

### 5. telegram-bot
**Purpose**: Telegram bot interface  
**Dependencies**: All previous packages  
**Can start**: After Phase 2

Features:
- Command handlers
- Interactive keyboards
- Conversation flows
- Notifications
- Authentication
- Message formatting

### 6. mcp-server
**Purpose**: Model Context Protocol server for AI agents  
**Dependencies**: All previous packages  
**Can start**: After Phase 2

Features:
- MCP tool definitions
- Tool handlers
- Context management
- AI integration

## Development Workflow

### Phase 1: Foundation (Parallel)
Two agents can work simultaneously:
- **Agent 1**: Task 1 - Enhance shared-types
- **Agent 2**: Task 2 - Expand utils

### Phase 2: Core Services (Parallel)
After Phase 1 completes:
- **Agent 3**: Task 3 - Complete api-client
- **Agent 4**: Task 4 - Build trading-service

### Phase 3: User Interfaces (Parallel)
After Phase 2 completes:
- **Agent 5**: Task 5 - Implement telegram-bot
- **Agent 6**: Task 6 - Create mcp-server

## Agent Task Files

Each agent should read their specific task file:

- [Task 1: Enhance Shared Types](./.github/agent-tasks/task-1-shared-types.md)
- [Task 2: Expand Utils](./.github/agent-tasks/task-2-utils.md)
- [Task 3: Complete API Client](./.github/agent-tasks/task-3-api-client.md)
- [Task 4: Build Trading Service](./.github/agent-tasks/task-4-trading-service.md)
- [Task 5: Implement Telegram Bot](./.github/agent-tasks/task-5-telegram-bot.md)
- [Task 6: Create MCP Server](./.github/agent-tasks/task-6-mcp-server.md)

## Working with Workspaces

### Install Package Dependencies
```bash
# Install deps for specific package
npm install --workspace=packages/api-client

# Add a dependency to a package
npm install axios --workspace=packages/api-client

# Add a workspace package as dependency
# (This is already configured in package.json files)
```

### Cross-Package Development
```bash
# Build dependencies first
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/utils

# Then build dependent package
npm run build --workspace=packages/api-client
```

### Type Checking
```bash
# Check all packages
npm run type-check

# Check specific package
npm run type-check --workspace=packages/api-client
```

## TypeScript Project References

The monorepo uses TypeScript project references for:
- Fast incremental builds
- Better IDE support
- Type checking across packages
- Build order management

Each package's `tsconfig.json` references its dependencies:
```json
{
  "references": [
    { "path": "../shared-types" },
    { "path": "../utils" }
  ]
}
```

## Package Dependencies

```
shared-types  (no deps)
utils         (no deps)
    ↓
api-client    (shared-types, utils)
    ↓
trading-service (shared-types, utils, api-client)
    ↓
telegram-bot   (all above)
mcp-server     (all above)
```

## Git Workflow

### Committing Changes
```bash
# Work on your package
cd packages/api-client
# Make changes...

# Stage and commit
git add .
git commit -m "feat(api-client): add crypto service"

# Push
git push
```

### Branch Strategy
- Each agent can work on their package branch
- Or use a single branch with clear commit messages
- Package prefixes in commits help: `feat(api-client):`, `fix(utils):`

## Testing Strategy

### Unit Tests
Each package has its own tests:
```bash
# Run tests for specific package
npm run test --workspace=packages/utils

# Run all tests
npm run test
```

### Integration Tests
Test cross-package interaction:
```bash
cd packages/trading-service
npm run test
# Tests will use actual api-client package
```

## Common Commands

```bash
# Install all dependencies
npm install

# Build everything
npm run build

# Build specific package
npm run build --workspace=packages/api-client

# Run tests
npm run test

# Clean everything
npm run clean

# Lint
npm run lint

# Type check all
npm run type-check

# Run telegram bot
npm run dev --workspace=packages/telegram-bot
```

## Troubleshooting

### "Cannot find module @robinhood-trading/..."
1. Make sure dependencies are installed: `npm install`
2. Build the dependency first: `npm run build --workspace=packages/shared-types`
3. Check package.json has correct workspace dependency

### Type errors across packages
1. Build all packages: `npm run build`
2. Restart TypeScript server in your IDE
3. Check tsconfig.json references are correct

### Changes not reflecting
1. Rebuild the package: `npm run build --workspace=packages/api-client`
2. Rebuild dependent packages
3. Use watch mode: `npm run watch --workspace=packages/api-client`

## Resources

- [Trading Bot Plans](/trading-bot-plans/README.md)
- [Original README](/README.md)
- [Agent Tasks](/.github/agent-tasks/README.md)
- [npm Workspaces](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)

## Next Steps

1. Review the [agent tasks directory](./.github/agent-tasks/README.md)
2. Choose a task based on dependencies
3. Read the specific task file
4. Start development on your package
5. Commit and push your changes
6. Move to next task or integrate with other packages
