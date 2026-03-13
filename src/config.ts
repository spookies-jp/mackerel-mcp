export const SERVER_CONFIG = {
  name: "@mackerel/mcp-server",
  version: "0.5.0",
  description:
    "A Model Context Protocol server for interacting with Mackerel API.",
  logo: "https://mackerel.io/images/logo-icon.svg",
  serverName: "Mackerel MCP Server",
} as const;

export const MACKEREL_CONFIG = {
  baseUrl: "https://api.mackerelio.com",
} as const;

export const API_ROUTE = "/mcp";
