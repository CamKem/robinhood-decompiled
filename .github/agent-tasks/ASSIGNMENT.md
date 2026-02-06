# Agent Task Assignment Guide

This document provides a quick reference for assigning tasks to agents working on the Robinhood trading monorepo.

## Task Overview

| Task | Package | Phase | Dependencies | Status | Estimated Time |
|------|---------|-------|--------------|--------|----------------|
| Task 1 | shared-types | Phase 1 | None | Ready | 2-4 hours |
| Task 2 | utils | Phase 1 | None | Ready | 3-5 hours |
| Task 3 | api-client | Phase 2 | shared-types, utils | Blocked | 6-8 hours |
| Task 4 | trading-service | Phase 2 | shared-types, utils, api-client | Blocked | 6-8 hours |
| Task 5 | telegram-bot | Phase 3 | All Phase 1 & 2 | Blocked | 4-6 hours |
| Task 6 | mcp-server | Phase 3 | All Phase 1 & 2 | Blocked | 4-6 hours |

## Parallel Execution Plan

### Phase 1: Foundation (Start immediately)
```
Agent A → Task 1: shared-types
Agent B → Task 2: utils
```
**Duration**: ~3-5 hours (parallel)

### Phase 2: Core Services (After Phase 1)
```
Agent C → Task 3: api-client
Agent D → Task 4: trading-service
```
**Duration**: ~6-8 hours (parallel)

### Phase 3: User Interfaces (After Phase 2)
```
Agent E → Task 5: telegram-bot
Agent F → Task 6: mcp-server
```
**Duration**: ~4-6 hours (parallel)

**Total Timeline**: ~13-19 hours with 6 parallel agents

## Task Assignment Instructions

### For Agent A (Task 1: shared-types)
```bash
# Read task file
cat .github/agent-tasks/task-1-shared-types.md

# Navigate to package
cd packages/shared-types

# Start work
npm install
npm run watch
```

**Focus**: Extract types from decompiled code, create crypto/options/futures types

### For Agent B (Task 2: utils)
```bash
# Read task file
cat .github/agent-tasks/task-2-utils.md

# Navigate to package
cd packages/utils

# Start work
npm install
npm run watch
```

**Focus**: Build caching, rate limiting, validation, and formatting utilities

### For Agent C (Task 3: api-client)
```bash
# Read task file
cat .github/agent-tasks/task-3-api-client.md

# Navigate to package
cd packages/api-client

# Start work
npm install
npm run watch
```

**Focus**: Extract API endpoints, implement services, add WebSocket support

### For Agent D (Task 4: trading-service)
```bash
# Read task file
cat .github/agent-tasks/task-4-trading-service.md

# Navigate to package
cd packages/trading-service

# Start work
npm install
npm run watch
```

**Focus**: Build order manager, risk manager, portfolio tracker, strategies

### For Agent E (Task 5: telegram-bot)
```bash
# Read task file
cat .github/agent-tasks/task-5-telegram-bot.md

# Navigate to package
cd packages/telegram-bot

# Start work
npm install
npm run watch
```

**Focus**: Implement bot commands, keyboards, notifications, authentication

### For Agent F (Task 6: mcp-server)
```bash
# Read task file
cat .github/agent-tasks/task-6-mcp-server.md

# Navigate to package
cd packages/mcp-server

# Start work
npm install
npm run watch
```

**Focus**: Implement MCP protocol, tool definitions, handlers

## Communication Protocol

### Status Updates
Each agent should update their task status:
```markdown
### Task [N] Status
- [ ] Started
- [ ] Dependencies installed
- [ ] Core implementation complete
- [ ] Tests written
- [ ] Documentation complete
- [ ] Ready for integration
```

### Blocking Issues
If an agent encounters a blocker:
1. Document the issue
2. Check if other agents are affected
3. Decide on resolution
4. Update task files if needed

### Integration Points
When phases complete:
1. **Phase 1 → Phase 2**: Verify shared-types and utils build successfully
2. **Phase 2 → Phase 3**: Verify api-client and trading-service build successfully
3. Final integration: Build all packages and run integration tests

## Quality Checklist

Before marking a task complete:
- [ ] Code builds without errors
- [ ] Types are properly exported
- [ ] No TypeScript errors
- [ ] Tests pass (if applicable)
- [ ] Documentation is complete
- [ ] README has usage examples
- [ ] Dependencies are correct in package.json

## Common Commands

```bash
# From repository root
npm install                    # Install all packages
npm run build                  # Build all packages
npm run type-check             # Check all types
npm run test                   # Run all tests
npm run clean                  # Clean all builds

# From specific package
cd packages/[package-name]
npm install                    # Install package deps
npm run build                  # Build package
npm run watch                  # Watch mode
npm run test                   # Run tests
npm run type-check             # Type check
```

## Success Criteria

### Phase 1 Complete
- [ ] shared-types builds and exports all types
- [ ] utils builds and exports all utilities
- [ ] Both packages have tests
- [ ] Documentation complete

### Phase 2 Complete
- [ ] api-client builds and all services work
- [ ] trading-service builds and managers work
- [ ] Integration between api-client and trading-service works
- [ ] Tests pass

### Phase 3 Complete
- [ ] telegram-bot runs and commands work
- [ ] mcp-server starts and tools work
- [ ] End-to-end integration works
- [ ] All documentation complete

### Final Integration
- [ ] All packages build: `npm run build`
- [ ] All tests pass: `npm run test`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All READMEs complete
- [ ] Example usage documented
- [ ] Ready for deployment

## Troubleshooting

### Build Errors
If you get build errors:
1. Check dependencies are installed: `npm install`
2. Build dependencies first: `npm run build --workspace=packages/shared-types`
3. Clear TypeScript cache: `rm -rf */tsconfig.tsbuildinfo`

### Type Errors
If you get type errors:
1. Rebuild referenced packages
2. Restart TypeScript language server
3. Check tsconfig.json references

### Workspace Errors
If workspace commands fail:
1. Ensure you're in repository root
2. Check package.json has correct workspaces
3. Try `npm install` again

## Resources

- [MONOREPO.md](../MONOREPO.md) - Full development guide
- [Trading Bot Plans](../trading-bot-plans/README.md) - Implementation plans
- [Decompiled Code](../audit/sources/com/robinhood/) - Source reference
- [Task Files](./) - Individual task definitions

## Contact & Coordination

For questions or coordination:
1. Check the task file for specific guidance
2. Review MONOREPO.md for general workflow
3. Consult trading-bot-plans for architectural decisions
4. Examine decompiled code for implementation details
