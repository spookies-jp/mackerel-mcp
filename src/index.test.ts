import { describe, expect, it, vi, beforeEach } from "vitest";

const { createMcpHandlerMock } = vi.hoisted(() => ({
  createMcpHandlerMock: vi.fn(),
}));

vi.mock("agents/mcp", () => ({
  createMcpHandler: createMcpHandlerMock,
}));

import app from "./index.js";

const executionCtx: ExecutionContext = {
  passThroughOnException: vi.fn(),
  props: {},
  waitUntil: vi.fn(),
};

describe("MCP HTTP endpoint", () => {
  beforeEach(() => {
    createMcpHandlerMock.mockReset();
  });

  it("returns 401 when the API key is missing", async () => {
    const response = await app.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
      }),
      {},
      executionCtx,
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
      message: "MACKEREL_APIKEY environment variable is not set.",
    });
    expect(createMcpHandlerMock).not.toHaveBeenCalled();
  });

  it("delegates authorized requests to agents/mcp", async () => {
    const mcpResponse = new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": "session-123",
      },
      status: 200,
    });
    const requestHandler = vi.fn(async () => mcpResponse);
    createMcpHandlerMock.mockReturnValue(requestHandler);

    const request = new Request("https://example.com/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: 1,
        jsonrpc: "2.0",
        method: "initialize",
      }),
    });

    const response = await app.fetch(
      request,
      {
        MACKEREL_APIKEY: "test-api-key",
      },
      executionCtx,
    );

    expect(createMcpHandlerMock).toHaveBeenCalledOnce();
    expect(createMcpHandlerMock.mock.calls[0]?.[1]).toEqual({
      enableJsonResponse: true,
      route: "/mcp",
    });
    expect(requestHandler).toHaveBeenCalledWith(
      request,
      {
        MACKEREL_APIKEY: "test-api-key",
      },
      executionCtx,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("mcp-session-id")).toBe("session-123");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
