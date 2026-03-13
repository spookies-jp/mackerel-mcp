# Mackerel MCP Server — Agent Knowledge Base

**Type:** TypeScript MCP Server  
**Runtime:** Cloudflare Workers (Wrangler)  
**SDK:** @modelcontextprotocol/sdk + Hono + Zod

---

## Overview

MCP server exposing Mackerel API as Model Context Protocol tools. Runs on Cloudflare Workers via Wrangler. Uses Hono for HTTP routing and Zod for input validation.

---

## Quick Navigation

| Task | Location |
|------|----------|
| Add new MCP tool | `src/tools/` → follow existing pattern |
| Register tool | `src/index.ts` (server.registerTool) |
| API client logic | `src/client.ts` (MackerelClient class) |
| Shared utilities | `src/tools/util.ts` (buildToolResponse) |
| Test helpers | `src/__tests__/` |
| MSW mock server | `src/mocks/server.ts` |
| API docs reference | https://mackerel.io/api-docs/ |

---

## Architecture

```
src/
├── index.ts          # Entry: Hono app + MCP server registration
├── client.ts         # MackerelClient: HTTP + caching layer
├── config.ts         # Server config constants
├── tools/            # MCP tool implementations (see src/tools/AGENTS.md)
├── mocks/            # MSW mock server for tests
└── __tests__/        # Shared test utilities
```

---

## Commands

```bash
# Development (local wrangler dev)
npm run dev

# Run tests
npm run test

# Type checking
npm run typecheck

# Format code
npm run format

# Deploy to Cloudflare
npm run deploy
```

---

## Critical Conventions

### 1. ESM Import Pattern
**ALWAYS use `.js` extension** in TypeScript imports (ESM requirement):
```typescript
import { AlertTool } from "./tools/alertTool.js";  // ✅
import { AlertTool } from "./tools/alertTool";      // ❌
```

### 2. Tool Development Pattern
Each tool follows this structure:
1. Define Zod schema as static class property (e.g., `ListAlertsToolInput`)
2. Include `.describe()` for every field (used in MCP tool descriptions)
3. Implement async method that calls `buildToolResponse()`
4. Register in `src/index.ts` with server.registerTool()
5. Add test file next to implementation

### 3. API Documentation Reference
When implementing tools, first visit https://mackerel.io/api-docs/ and follow endpoint links for detailed specifications.

---

## Code Map (Key Exports)

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `default` (app) | Hono app | `src/index.ts:296` | Cloudflare Worker entry |
| `createServer` | Function | `src/index.ts:22` | Builds McpServer with tools |
| `MackerelClient` | Class | `src/client.ts:5` | HTTP client + Cloudflare caching |
| `buildToolResponse` | Function | `src/tools/util.ts:195` | Response wrapper with token limits |
| `mswServer` | MSW server | `src/mocks/server.ts:2` | Test mock server |

---

## Anti-Patterns (Forbidden)

1. **NEVER omit `.js` in imports** — ESM runtime requires explicit extensions
2. **NEVER suppress type errors** — No `as any`, `@ts-ignore`, `@ts-expect-error`
3. **NEVER skip Zod `.describe()`** — Field descriptions appear in MCP tool schemas
4. **NEVER cache non-GET requests** — Only GET requests use Cloudflare cache
5. **NEVER break token limit** — Responses >25k tokens auto-rejected (see util.ts)

---

## Testing Patterns

- **Framework:** Vitest with `environment: "node"`
- **Mocking:** MSW (Mock Service Worker) for API mocking
- **Location:** Tests colocated with source (`*.test.ts`)
- **Setup:** `vitest.setup.ts` configures MSW globally

---

## Deployment

Cloudflare Workers via Wrangler. Default export is Hono app that handles MCP transport per-request (WebStandardStreamableHTTPServerTransport).

---

*Generated: March 2026*
