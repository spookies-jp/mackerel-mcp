# Tools Directory — Agent Knowledge Base

**Scope:** MCP tool implementations  
**Pattern:** One file per domain + colocated tests

---

## Tool Structure

Each tool is a class with static Zod schemas and arrow-function methods:

```typescript
export class ExampleTool {
  constructor(private mackerelClient: MackerelClient) {}

  static ListExampleToolInput = z.object({
    limit: z.number().optional().describe("Max items to return"),
  });

  listExamples = async (
    args: z.infer<typeof ExampleTool.ListExampleToolInput>
  ) => {
    return await buildToolResponse(
      async () => await this.mackerelClient.getExamples(args.limit)
    );
  };
}
```

---

## Required Patterns

### 1. Zod Schemas (Static)
- Define as `static` class property: `static ListXxxToolInput = z.object({...})`
- Always use `.describe()` on every field - descriptions appear in MCP tool schemas
- For discriminated unions: use `z.discriminatedUnion("type", [...])`

### 2. Arrow Function Methods
- Methods MUST be arrow functions: `listXxx = async (...) => {...}`
- This preserves `this` binding when passed to `server.registerTool()`
- Always wrap returns with `buildToolResponse()`

### 3. Registration (in src/index.ts)
```typescript
const exampleTool = new ExampleTool(mackerelClient);
server.registerTool("list_examples", {
  title: "List Examples",
  description: "Retrieve examples from Mackerel.",
  inputSchema: ExampleTool.ListExampleToolInput.shape,
  annotations: { readOnlyHint: true },  // For read-only endpoints
}, exampleTool.listExamples);
```

### 4. Error Handling
- Never throw from tool methods - always use `buildToolResponse()`
- It handles: serialization, token limits (25k), error formatting
- HTTP errors bubble from client; buildToolResponse catches and formats them

---

## Files

| Tool | File | Description |
|------|------|-------------|
| Alerts | `alertTool.ts` | List, get, and get logs for alerts |
| Dashboards | `dashboardTool.ts` | List, get, update dashboards (complex widgets) |
| Hosts | `hostTool.ts` | List hosts with filters |
| Host Metrics | `hostMetricsTool.ts` | Get metrics data for hosts |
| Services | `serviceTool.ts` | List services |
| Service Metrics | `serviceMetricsTool.ts` | Get metrics for services |
| Monitors | `monitorTool.ts` | List and get monitor configs |
| Traces | `traceTool.ts` | Get trace by ID, list traces (complex filters) |
| APM | `apmTool.ts` | HTTP server stats, DB query stats |
| Utilities | `util.ts` | `buildToolResponse()`, pagination helpers |

---

## Testing

- Test file: `<toolName>.test.ts` colocated with implementation
- Uses MSW mock server (from `src/mocks/server.ts`)
- Test helpers in `src/__tests__/` for common setups

---

## Conventions

1. **File naming:** `lowerCamelTool.ts`
2. **Class naming:** `PascalCaseTool`
3. **Method naming:** `camelCase` matching API action
4. **Schema naming:** `ListXxxToolInput`, `GetXxxToolInput`
5. **Imports:** ALWAYS use `.js` extension

---

## Critical: ESM Imports

```typescript
import { AlertTool } from "./alertTool.js";     // ✅
import { AlertTool } from "./alertTool";       // ❌ Runtime fails
```

---

*See parent AGENTS.md for full project context.*
