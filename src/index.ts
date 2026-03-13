import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { AlertTool } from "./tools/alertTool.js";
import { DashboardTool } from "./tools/dashboardTool.js";
import { MonitorTool } from "./tools/monitorTool.js";
import { HostTool } from "./tools/hostTool.js";
import { ServiceTool } from "./tools/serviceTool.js";
import { TraceTool } from "./tools/traceTool.js";
import { MackerelClient } from "./client.js";
import { ServiceMetricsTool } from "./tools/serviceMetricsTool.js";
import { HostMetricsTool } from "./tools/hostMetricsTool.js";
import { ApmTool } from "./tools/apmTool.js";
import { SERVER_CONFIG, MACKEREL_CONFIG, API_ROUTE } from "./config.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export interface Env {
  MACKEREL_APIKEY?: string;
}

const BASE_URL = MACKEREL_CONFIG.baseUrl;

function createServer(mackerelClient: MackerelClient) {
  const alertTool = new AlertTool(mackerelClient);
  const dashboardTool = new DashboardTool(mackerelClient);
  const monitorTool = new MonitorTool(mackerelClient);
  const hostTool = new HostTool(mackerelClient);
  const hostMetricsTool = new HostMetricsTool(mackerelClient);
  const serviceTool = new ServiceTool(mackerelClient);
  const serviceMetricsTool = new ServiceMetricsTool(mackerelClient);
  const traceTool = new TraceTool(mackerelClient);
  const apmTool = new ApmTool(mackerelClient);

  const server = new McpServer({
    name: SERVER_CONFIG.name,
    version: SERVER_CONFIG.version,
  });

  server.registerTool(
    "list_alerts",
    {
      title: "List Alerts",
      description: "Retrieve alerts from Mackerel.",
      inputSchema: AlertTool.ListAlertsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    alertTool.listAlerts,
  );

  server.registerTool(
    "get_alert",
    {
      title: "Get Alert",
      description: "Retrieve a specific alert by ID from Mackerel.",
      inputSchema: AlertTool.GetAlertToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    alertTool.getAlert,
  );

  server.registerTool(
    "get_alert_logs",
    {
      title: "Get Alert Logs",
      description: "Retrieve logs for a specific alert by ID from Mackerel.",
      inputSchema: AlertTool.GetAlertLogsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    alertTool.getAlertLogs,
  );

  server.registerTool(
    "list_dashboards",
    {
      title: "List Dashboards",
      description: "Retrieve all dashboards from Mackerel.",
      inputSchema: DashboardTool.ListDashboardsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    dashboardTool.listDashboards,
  );

  server.registerTool(
    "get_dashboard",
    {
      title: "Get Dashboard",
      description: "Retrieve a specific dashboard by ID from Mackerel.",
      inputSchema: DashboardTool.GetDashboardToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    dashboardTool.getDashboard,
  );

  server.registerTool(
    "update_dashboard",
    {
      title: "Update Dashboard",
      description: "Update a specific dashboard by ID in Mackerel.",
      inputSchema: DashboardTool.UpdateDashboardToolInput.shape,
    },
    dashboardTool.updateDashboard,
  );

  server.registerTool(
    "list_hosts",
    {
      title: "List Hosts",
      description: "Retrieve hosts from Mackerel.",
      inputSchema: HostTool.ListHostsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    hostTool.listHosts,
  );

  server.registerTool(
    "get_host_metrics",
    {
      title: "Get Host Metrics",
      description: "Retrieve metrics data for a specific host from Mackerel.",
      inputSchema: HostMetricsTool.GetHostMetricsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    hostMetricsTool.getHostMetrics,
  );

  server.registerTool(
    "list_services",
    {
      title: "List Services",
      description: "Retrieve all services from Mackerel.",
      inputSchema: ServiceTool.ListServicesToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    serviceTool.listServices,
  );

  server.registerTool(
    "get_service_metrics",
    {
      title: "Get Service Metrics",
      description:
        "Retrieve metrics data for a specific service from Mackerel.",
      inputSchema: ServiceMetricsTool.GetServiceMetricsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    serviceMetricsTool.getServiceMetrics,
  );

  server.registerTool(
    "list_monitors",
    {
      title: "List Monitors",
      description: "Retrieve all monitor configurations from Mackerel.",
      inputSchema: MonitorTool.ListMonitorsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    monitorTool.listMonitors,
  );

  server.registerTool(
    "get_monitor",
    {
      title: "Get Monitor",
      description:
        "Retrieve a specific monitor configuration by ID from Mackerel.",
      inputSchema: MonitorTool.GetMonitorToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    monitorTool.getMonitor,
  );

  server.registerTool(
    "get_trace",
    {
      title: "Get Trace",
      description:
        "Retrieve trace data by trace ID from Mackerel for distributed tracing analysis.",
      inputSchema: TraceTool.GetTraceToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    traceTool.getTrace,
  );

  server.registerTool(
    "list_traces",
    {
      title: "List Traces",
      description:
        "Search and retrieve traces from Mackerel for distributed tracing analysis.",
      inputSchema: TraceTool.ListTracesToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    traceTool.listTraces,
  );

  server.registerTool(
    "list_http_server_stats",
    {
      title: "List HTTP Server Statistics",
      description: "Retrieve HTTP server statistics from Mackerel.",
      inputSchema: ApmTool.ListHttpServerStatsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    apmTool.listHttpServerStats,
  );

  server.registerTool(
    "list_db_query_stats",
    {
      title: "List Database Query Statistics",
      description: "Retrieve database query statistics from Mackerel.",
      inputSchema: ApmTool.ListDbQueryStatsToolInput.shape,
      annotations: {
        readOnlyHint: true,
      },
    },
    apmTool.listDbQueryStats,
  );

  return server;
}

const app = new Hono<{ Bindings: Env }>();

app.all(API_ROUTE, async (c) => {
  const apiKey = c.env.MACKEREL_APIKEY;

  if (!apiKey) {
    return c.json(
      {
        error: "Unauthorized",
        message: "MACKEREL_APIKEY environment variable is not set.",
      },
      401,
    );
  }

  const mackerelClient = new MackerelClient(BASE_URL, apiKey);
  const server = createServer(mackerelClient);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  await server.connect(transport);

  return transport.handleRequest(c.req.raw);
});

export default app;
