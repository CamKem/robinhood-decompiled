# Task 1: Enhance Shared Types Package

## Package
`packages/shared-types`

## Priority
High (Phase 1 - No dependencies)

## Description
Enhance the shared types package by extracting additional type definitions from the decompiled Robinhood Android app code. This package provides the foundation for all other packages in the monorepo.

## Dependencies
None - This task can start immediately

## Reference Documentation
- Main README: `/trading-bot-plans/README.md`
- Decompiled code: `/audit/sources/com/robinhood/`
- Type references: `/audit/sources/com/robinhood/libmodelsequity/order/`

## Goals

### 1. Extract Order Types
Search the decompiled code for order-related classes:
```bash
find /home/runner/work/robinhood-decompiled/robinhood-decompiled/audit/sources -name "*Order*.java"
```

Add types for:
- Order execution types
- Order triggers (immediate, stop, limit)
- Extended hours trading options

### 2. Extract Crypto Types
Look in: `/audit/sources/com/robinhood/shared/trade/crypto/`

Add types for:
- Crypto order requests
- Crypto positions
- Crypto quotes
- Crypto transfer types

### 3. Extract Options Types
Look in: `/audit/sources/com/robinhood/options/`

Add types for:
- Options contracts
- Options chains
- Options strategies
- Options positions

### 4. Extract Futures Types
Look in: `/audit/sources/com/robinhood/futures/`

Add types for:
- Futures contracts
- Futures positions
- Futures orders

### 5. Add Validation Types
Create type guards and validation utilities:
```typescript
export function isValidOrder(order: any): order is Order { ... }
export function isValidSymbol(symbol: string): boolean { ... }
```

## Deliverables

1. **Enhanced trading.types.ts** with:
   - Crypto types
   - Options types
   - Futures types
   - Extended order types

2. **New files**:
   - `src/crypto.types.ts` - Cryptocurrency types
   - `src/options.types.ts` - Options trading types
   - `src/futures.types.ts` - Futures trading types
   - `src/validators.ts` - Type guards and validators

3. **Documentation**:
   - JSDoc comments for all types
   - Examples in README
   - Type usage guide

## Success Criteria

- [ ] All core trading types are defined
- [ ] Crypto, options, and futures types are added
- [ ] Type guards and validators are implemented
- [ ] Package builds successfully: `npm run build`
- [ ] No TypeScript errors: `npm run type-check`
- [ ] All types are exported from index.ts
- [ ] JSDoc comments are complete
- [ ] README is updated with examples

## Commands

```bash
cd /home/runner/work/robinhood-decompiled/robinhood-decompiled/packages/shared-types

# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Watch mode for development
npm run watch
```

## Notes

- Focus on accuracy - these types are used across all packages
- Use readonly where appropriate for immutability
- Add union types for enums (e.g., OrderType = 'market' | 'limit')
- Include detailed JSDoc comments explaining each type
- Reference the decompiled Java code for field names and types
