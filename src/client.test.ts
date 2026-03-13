import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { MackerelClient } from "./client.js";
import { mswServer } from "./mocks/server.js";
import { HttpResponse, http } from "msw";
import { MACKEREL_BASE_URL } from "./__tests__/mackerelClient.js";

describe("MackerelClient Cache", () => {
  let client: MackerelClient;
  let mockCache: Map<string, Response>;

  beforeAll(() => {
    mockCache = new Map();
    
    const mockCaches = {
      default: {
        match: async (request: Request) => {
          return mockCache.get(request.url) || null;
        },
        put: async (request: Request, response: Response) => {
          mockCache.set(request.url, response.clone());
        },
        delete: async (request: Request) => {
          return mockCache.delete(request.url);
        },
      },
    };
    
    (globalThis as typeof globalThis & { caches: typeof mockCaches }).caches = mockCaches;
  });

  beforeEach(() => {
    client = new MackerelClient(MACKEREL_BASE_URL, "test-api-key", 1);
    mockCache.clear();
  });

  afterAll(() => {
    delete (globalThis as { caches?: unknown }).caches;
  });

  it("should cache GET requests", async () => {
    const alerts = [
      {
        id: "alert1",
        status: "CRITICAL",
        monitorId: "monitor1",
        type: "host",
        openedAt: 1600000000,
      },
    ];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, () => {
        callCount++;
        return HttpResponse.json({ alerts });
      }),
    );

    const result1 = await client.getAlerts(false, undefined, undefined);
    expect(result1.alerts).toEqual(alerts);
    expect(callCount).toBe(1);

    const result2 = await client.getAlerts(false, undefined, undefined);
    expect(result2.alerts).toEqual(alerts);
    expect(callCount).toBe(1);
  });

  it("should not cache requests with different parameters", async () => {
    const alerts1 = [{ id: "alert1", status: "CRITICAL" }];
    const alerts2 = [{ id: "alert2", status: "WARNING" }];

    let callCount = 0;
    mswServer.use(
      http.get(`${MACKEREL_BASE_URL}/api/v0/alerts`, ({ request }) => {
        callCount++;
        const url = new URL(request.url);
        const withClosed = url.searchParams.get("withClosed");

        if (withClosed === "true") {
          return HttpResponse.json({ alerts: alerts2 });
        }
        return HttpResponse.json({ alerts: alerts1 });
      }),
    );

    const result1 = await client.getAlerts(false, undefined, undefined);
    expect(result1.alerts).toEqual(alerts1);
    expect(callCount).toBe(1);

    const result2 = await client.getAlerts(true, undefined, undefined);
    expect(result2.alerts).toEqual(alerts2);
    expect(callCount).toBe(2);
  });

  it("should not cache PUT requests", async () => {
    const dashboard = {
      title: "Test Dashboard",
      memo: "Test memo",
      urlPath: "test-path",
      widgets: [],
    };

    let callCount = 0;
    mswServer.use(
      http.put(`${MACKEREL_BASE_URL}/api/v0/dashboards/test-id`, () => {
        callCount++;
        return HttpResponse.json({ dashboard });
      }),
    );

    await client.updateDashboard("test-id", dashboard);
    expect(callCount).toBe(1);

    await client.updateDashboard("test-id", dashboard);
    expect(callCount).toBe(2);
  });
});
