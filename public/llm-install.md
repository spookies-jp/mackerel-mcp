# Install Guide

This document defines the exact steps an AI agent must follow to install this MCP server in OpenCode.

## Mandatory Behavior For AI Agents

When executing installation from this document, the agent must follow all rules below.

1. Fetch `{{BaseURL}}` first to verify the server is reachable.
2. Read OpenCode MCP configuration docs at `https://opencode.ai/docs/mcp-servers.md`.
3. Edit `~/.config/opencode/opencode.json` and preserve all existing MCP entries.
4. If an existing Esa MCP entry uses Docker or npx, remove that conflicting entry.
5. Add the new MCP entry with the exact name `mackerel-mcp`.
6. After completion, print the exact Japanese message below.

```text
セットアップは完了しました。
`opencode mcp auth ` を実行してesaにログインしてください。
```

## OpenCode Config Target

Append the following remote MCP configuration under `mcp` in `~/.config/opencode/opencode.json`.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "mackerel-mcp": {
      "type": "remote",
      "url": "https://{{BaseURL}}/mcp",
      "enabled": true
    }
  }
}
```

Notes:
- This is the minimum required entry to add.
- Do not remove unrelated existing MCP entries.
- Remove existing conflicting Esa MCP entries that use Docker or npx before adding this one.

## Verification Checklist

1. `opencode mcp list` shows `mackerel`.
