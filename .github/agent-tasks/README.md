# Agent Tasks - Monorepo Implementation

This directory contains task manifests for parallel agent development of the Robinhood trading bot monorepo.

## Overview

The monorepo has been structured into separate packages that can be developed independently by multiple agents working in parallel. Each task is self-contained and focuses on a specific package or feature.

## Package Structure

```
packages/
├── shared-types/      - Common TypeScript types and interfaces
├── utils/             - Shared utilities and helpers
├── api-client/        - Robinhood API client
├── trading-service/   - Trading logic and strategies
├── telegram-bot/      - Telegram bot interface
└── mcp-server/        - Model Context Protocol integration
```

## Agent Tasks

Each task file describes:
- Package to work on
- Dependencies on other packages
- Specific implementation goals
- Reference documentation
- Success criteria

## Task Files

1. **[task-1-shared-types.md](./task-1-shared-types.md)** - Enhance shared types
2. **[task-2-utils.md](./task-2-utils.md)** - Expand utility functions
3. **[task-3-api-client.md](./task-3-api-client.md)** - Complete API client implementation
4. **[task-4-trading-service.md](./task-4-trading-service.md)** - Build trading engine
5. **[task-5-telegram-bot.md](./task-5-telegram-bot.md)** - Implement Telegram bot
6. **[task-6-mcp-server.md](./task-6-mcp-server.md)** - Create MCP server

## Parallelization Strategy

### Phase 1 (Can run in parallel)
- Task 1: shared-types (no dependencies)
- Task 2: utils (no dependencies)

### Phase 2 (Can run in parallel after Phase 1)
- Task 3: api-client (depends on: shared-types, utils)
- Task 4: trading-service (depends on: shared-types, utils, api-client)

### Phase 3 (Can run in parallel after Phase 2)
- Task 5: telegram-bot (depends on: all previous)
- Task 6: mcp-server (depends on: all previous)

## How to Use

1. Assign each task to a separate agent instance
2. Agents should read their specific task file
3. Agents work independently on their assigned package
4. Agents commit their changes to the repository
5. Integration happens automatically via npm workspaces

## Development Workflow

```bash
# Install all dependencies
npm install

# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/api-client

# Run specific package
npm run dev --workspace=packages/telegram-bot

# Run tests
npm run test
```

## Integration Points

All packages use:
- TypeScript project references for type checking
- npm workspaces for dependency management
- Shared ESLint configuration
- Common tsconfig.json base

## Success Criteria

- All packages build successfully
- All tests pass
- Types are properly shared across packages
- Documentation is complete
- Code follows TypeScript best practices
