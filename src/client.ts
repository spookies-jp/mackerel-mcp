import { z } from "zod";
import { DashboardTool } from "./tools/dashboardTool.js";
import { applyPagination } from "./tools/util.js";

export class MackerelClient {
  private readonly baseUrl: string;
  private apiKey: string;
  private readonly cacheTTL: number;

  constructor(baseUrl: string, apiKey: string, cacheTTL: number = 300) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.cacheTTL = cacheTTL;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  getApiKey(): string {
    return this.apiKey;
  }

  private getCacheKey(
    method: string,
    path: string,
    searchParams?: URLSearchParams,
  ): string {
    const paramsString = searchParams ? searchParams.toString() : "";
    return `${this.apiKey}:${method}:${path}:${paramsString}`;
  }

  private async getFromCache<T>(cacheKey: string): Promise<T | null> {
    try {
      const cache = caches.default;
      const cachedResponse = await cache.match(
        new Request(`https://cache.mackerel-mcp/${cacheKey}`),
      );
      if (cachedResponse) {
        return (await cachedResponse.json()) as T;
      }
    } catch {}
    return null;
  }

  private async setCache(cacheKey: string, data: any): Promise<void> {
    try {
      const cache = caches.default;
      const response = new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `max-age=${this.cacheTTL}`,
        },
      });
      await cache.put(
        new Request(`https://cache.mackerel-mcp/${cacheKey}`),
        response,
      );
    } catch {}
  }

  public async clearCache(): Promise<void> {}

  private async request<T>(
    method: string,
    path: string,
    {
      searchParams,
      body,
    }: {
      searchParams?: URLSearchParams;
      body?: any;
    } = {},
  ): Promise<T> {
    if (method === "GET") {
      const cacheKey = this.getCacheKey(method, path, searchParams);
      const cachedResult = await this.getFromCache<T>(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
    }

    const url = `${this.baseUrl}${path}${searchParams ? "?" + searchParams.toString() : ""}`;
    const headers: HeadersInit = {
      "X-Api-Key": this.apiKey,
      "Content-Type": "application/json",
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mackerel API error: ${response.status} ${errorText}`);
    }

    const result = (await response.json()) as T;

    if (method === "GET") {
      const cacheKey = this.getCacheKey(method, path, searchParams);
      await this.setCache(cacheKey, result);
    }

    return result;
  }

  async getAlerts(
    withClosed: boolean | undefined,
    nextId: string | undefined,
    limit: number | undefined,
  ): Promise<{ alerts: any[]; nextId?: string }> {
    const searchParams = new URLSearchParams();
    if (withClosed !== undefined) {
      searchParams.append("withClosed", withClosed.toString());
    }
    if (nextId) {
      searchParams.append("nextId", nextId);
    }
    if (limit !== undefined) {
      searchParams.append("limit", limit.toString());
    }

    return this.request<{ alerts: any[]; nextId?: string }>(
      "GET",
      "/api/v0/alerts",
      { searchParams },
    );
  }

  async getAlert(alertId: string) {
    return this.request<{ alert: any }>("GET", `/api/v0/alerts/${alertId}`);
  }

  async getAlertLogs(
    alertId: string,
    nextId: string | undefined,
    limit: number | undefined,
  ): Promise<{ logs: any[]; nextId?: string }> {
    const searchParams = new URLSearchParams();
    if (nextId) {
      searchParams.append("nextId", nextId);
    }
    if (limit !== undefined) {
      searchParams.append("limit", limit.toString());
    }

    return this.request<{ logs: any[]; nextId?: string }>(
      "GET",
      `/api/v0/alerts/${alertId}/logs`,
      { searchParams },
    );
  }

  async getDashboards(
    limit?: number,
    offset?: number,
  ): Promise<{
    dashboards: any[];
    pageInfo: { hasNextPage: boolean; hasPrevPage: boolean };
  }> {
    const response = await this.request<{ dashboards: any[] }>(
      "GET",
      "/api/v0/dashboards",
    );

    const effectiveLimit = limit || 20;
    const effectiveOffset = offset || 0;
    const totalDashboards = response.dashboards.length;

    const paginatedDashboards = applyPagination(response.dashboards, {
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    const pageInfo = {
      hasPrevPage: effectiveOffset > 0,
      hasNextPage: effectiveOffset + effectiveLimit < totalDashboards,
    };

    return {
      dashboards: paginatedDashboards,
      pageInfo,
    };
  }

  async getDashboard(dashboardId: string) {
    return this.request<any>("GET", `/api/v0/dashboards/${dashboardId}`);
  }

  private static WidgetArray = z.array(DashboardTool.WidgetSchema);

  async updateDashboard(
    dashboardId: string,
    dashboard: {
      title: string;
      memo: string;
      urlPath: string;
      widgets: z.infer<typeof MackerelClient.WidgetArray>;
    },
  ) {
    return this.request<any>("PUT", `/api/v0/dashboards/${dashboardId}`, {
      body: dashboard,
    });
  }

  async getHosts(
    service: string | undefined,
    role: string[] | undefined,
    name: string | undefined,
    status: string[] | undefined,
    customIdentifier: string | undefined,
    limit?: number,
    offset?: number,
  ): Promise<{
    hosts: any[];
    pageInfo: { hasNextPage: boolean; hasPrevPage: boolean };
  }> {
    const searchParams = new URLSearchParams();
    if (service) {
      searchParams.append("service", service);
    }
    if (role) {
      for (const r of role) {
        searchParams.append("role", r);
      }
    }
    if (name) {
      searchParams.append("name", name);
    }
    if (status) {
      for (const s of status) {
        searchParams.append("status", s);
      }
    }
    if (customIdentifier) {
      searchParams.append("customIdentifier", customIdentifier);
    }

    const response = await this.request<{ hosts: any[] }>(
      "GET",
      "/api/v0/hosts",
      {
        searchParams,
      },
    );

    const effectiveLimit = limit || 20;
    const effectiveOffset = offset || 0;
    const totalHosts = response.hosts.length;

    const paginatedHosts = applyPagination(response.hosts, {
      limit: effectiveLimit,
      offset: effectiveOffset,
    });

    const pageInfo = {
      hasPrevPage: effectiveOffset > 0,
      hasNextPage: effectiveOffset + effectiveLimit < totalHosts,
    };

    return {
      hosts: paginatedHosts,
      pageInfo,
    };
  }

  async getHostMetrics(
    hostId: string,
    name: string,
    from: number,
    to: number,
  ): Promise<{ metrics: Array<{ time: number; value: number }> }> {
    const searchParams = new URLSearchParams();
    searchParams.append("name", name);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());

    return this.request<{ metrics: Array<{ time: number; value: number }> }>(
      "GET",
      `/api/v0/hosts/${hostId}/metrics`,
      { searchParams },
    );
  }

  async getServices(): Promise<{ services: any[] }> {
    return this.request<{ services: any[] }>("GET", "/api/v0/services");
  }

  async getServiceMetrics(
    serviceName: string,
    name: string,
    from: number,
    to: number,
  ): Promise<{ metrics: Array<{ time: number; value: number }> }> {
    const searchParams = new URLSearchParams();
    searchParams.append("name", name);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());

    return this.request<{ metrics: Array<{ time: number; value: number }> }>(
      "GET",
      `/api/v0/services/${serviceName}/metrics`,
      { searchParams },
    );
  }

  async getMonitors(): Promise<{ monitors: any[] }> {
    return this.request<{ monitors: any[] }>("GET", "/api/v0/monitors");
  }

  async getMonitor(monitorId: string) {
    return this.request<{ monitor: any }>(
      "GET",
      `/api/v0/monitors/${monitorId}`,
    );
  }

  async getTrace(traceId: string): Promise<{ spans: any[] }> {
    return this.request<{ spans: any[] }>("GET", `/api/v0/traces/${traceId}`);
  }

  async getHttpServerStats(
    serviceName: string,
    from: number,
    to: number,
    serviceNamespace?: string,
    environment?: string,
    version?: string,
    method?: string,
    route?: string,
    orderColumn?: string,
    orderDirection?: string,
    page?: number,
    perPage?: number,
  ): Promise<{
    results: Array<{
      method: string;
      route: string;
      totalMillis: number;
      averageMillis: number;
      approxP95Millis: number;
      errorRatePercentage: number;
      requestCount: number;
    }>;
    hasNextPage: boolean;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append("serviceName", serviceName);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());
    if (serviceNamespace) {
      searchParams.append("serviceNamespace", serviceNamespace);
    }
    if (environment) {
      searchParams.append("environment", environment);
    }
    if (version) {
      searchParams.append("version", version);
    }
    if (method) {
      searchParams.append("method", method);
    }
    if (route) {
      searchParams.append("route", route);
    }
    if (orderColumn) {
      searchParams.append("orderColumn", orderColumn);
    }
    if (orderDirection) {
      searchParams.append("orderDirection", orderDirection);
    }
    if (page !== undefined) {
      searchParams.append("page", page.toString());
    }
    if (perPage !== undefined) {
      searchParams.append("perPage", perPage.toString());
    }

    return this.request<{
      results: Array<{
        method: string;
        route: string;
        totalMillis: number;
        averageMillis: number;
        approxP95Millis: number;
        errorRatePercentage: number;
        requestCount: number;
      }>;
      hasNextPage: boolean;
    }>("GET", "/api/v0/apm/http-server-stats", { searchParams });
  }

  async getDbQueryStats(
    serviceName: string,
    from: number,
    to: number,
    serviceNamespace?: string,
    environment?: string,
    version?: string,
    query?: string,
    orderColumn?: string,
    orderDirection?: string,
    page?: number,
    perPage?: number,
  ): Promise<{
    results: Array<{
      query: string;
      executionCount: number;
      totalMillis: number;
      averageMillis: number;
      approxP95Millis: number;
    }>;
    hasNextPage: boolean;
  }> {
    const searchParams = new URLSearchParams();
    searchParams.append("serviceName", serviceName);
    searchParams.append("from", from.toString());
    searchParams.append("to", to.toString());
    if (serviceNamespace) {
      searchParams.append("serviceNamespace", serviceNamespace);
    }
    if (environment) {
      searchParams.append("environment", environment);
    }
    if (version) {
      searchParams.append("version", version);
    }
    if (query) {
      searchParams.append("query", query);
    }
    if (orderColumn) {
      searchParams.append("orderColumn", orderColumn);
    }
    if (orderDirection) {
      searchParams.append("orderDirection", orderDirection);
    }
    if (page !== undefined) {
      searchParams.append("page", page.toString());
    }
    if (perPage !== undefined) {
      searchParams.append("perPage", perPage.toString());
    }

    return this.request<{
      results: Array<{
        query: string;
        executionCount: number;
        totalMillis: number;
        averageMillis: number;
        approxP95Millis: number;
      }>;
      hasNextPage: boolean;
    }>("GET", "/api/v0/apm/db-query-stats", { searchParams });
  }

  async listTraces(params: {
    serviceName: string;
    from: number;
    to: number;
    serviceNamespace?: string;
    environment?: string;
    traceId?: string;
    spanName?: string;
    version?: string;
    issueFingerprint?: string;
    minLatencyMillis?: number;
    maxLatencyMillis?: number;
    attributes?: Array<{
      key: string;
      value: string;
      type: string;
      operator: string;
    }>;
    resourceAttributes?: Array<{
      key: string;
      value: string;
      type: string;
      operator: string;
    }>;
    page?: number;
    perPage?: number;
    order?: { column: string; direction: string };
  }): Promise<{
    results: Array<{
      traceId: string;
      serviceName: string;
      serviceNamespace: string;
      environment: string;
      title: string;
      traceStartAt: number;
      traceLatencyMillis: number;
      serviceStartAt: number;
      serviceLatencyMillis: number;
    }>;
    hasNextPage: boolean;
  }> {
    const body: Record<string, any> = {
      serviceName: params.serviceName,
      from: params.from,
      to: params.to,
    };

    if (params.serviceNamespace) {
      body.serviceNamespace = params.serviceNamespace;
    }
    if (params.environment) {
      body.environment = params.environment;
    }
    if (params.traceId) {
      body.traceId = params.traceId;
    }
    if (params.spanName) {
      body.spanName = params.spanName;
    }
    if (params.version) {
      body.version = params.version;
    }
    if (params.issueFingerprint) {
      body.issueFingerprint = params.issueFingerprint;
    }
    if (params.minLatencyMillis !== undefined) {
      body.minLatencyMillis = params.minLatencyMillis;
    }
    if (params.maxLatencyMillis !== undefined) {
      body.maxLatencyMillis = params.maxLatencyMillis;
    }
    if (params.attributes && params.attributes.length > 0) {
      body.attributes = params.attributes;
    }
    if (params.resourceAttributes && params.resourceAttributes.length > 0) {
      body.resourceAttributes = params.resourceAttributes;
    }
    if (params.page !== undefined) {
      body.page = params.page;
    }
    if (params.perPage !== undefined) {
      body.perPage = params.perPage;
    }
    if (params.order) {
      body.order = params.order;
    }

    return this.request<{
      results: Array<{
        traceId: string;
        serviceName: string;
        serviceNamespace: string;
        environment: string;
        title: string;
        traceStartAt: number;
        traceLatencyMillis: number;
        serviceStartAt: number;
        serviceLatencyMillis: number;
      }>;
      hasNextPage: boolean;
    }>("POST", "/api/v0/traces", { body });
  }
}
