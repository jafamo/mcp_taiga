import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configure } from "./services/taiga.js";
import { logger } from "./logger.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerMilestoneTools } from "./tools/milestones.js";
import { registerUserStoryTools } from "./tools/userstories.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerIssueTools } from "./tools/issues.js";
import { registerEpicTools } from "./tools/epics.js";
import { registerWikiAndSearchTools } from "./tools/wiki-search.js";

// ─── Validate Environment ─────────────────────────────────────────────────────

const TAIGA_URL = process.env["TAIGA_URL"];
const TAIGA_AUTH_TOKEN = process.env["TAIGA_AUTH_TOKEN"];

if (!TAIGA_URL || !TAIGA_AUTH_TOKEN) {
  logger.error("Missing required environment variables", {
    TAIGA_URL: TAIGA_URL ? "set" : "missing",
    TAIGA_AUTH_TOKEN: TAIGA_AUTH_TOKEN ? "set" : "missing",
  });
  process.stderr.write([
    "",
    "Required environment variables:",
    "  TAIGA_URL        - Base URL of your Taiga instance (e.g. https://taiga.example.com)",
    "  TAIGA_AUTH_TOKEN - Taiga authentication token",
    "",
    "To obtain the token:",
    "  curl -s -X POST <TAIGA_URL>/api/v1/auth \\",
    '    -H "Content-Type: application/json" \\',
    "    -d '{\"type\":\"normal\",\"username\":\"<user>\",\"password\":\"<pass>\"}' | grep auth_token",
    "",
  ].join("\n"));
  process.exit(1);
}

configure(TAIGA_URL, TAIGA_AUTH_TOKEN);
logger.info("Configuration loaded", { taiga_url: TAIGA_URL });

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "taiga-mcp-server",
  version: "1.0.0",
});

// ─── Register All Tools ───────────────────────────────────────────────────────

registerProjectTools(server);
registerMilestoneTools(server);
registerUserStoryTools(server);
registerTaskTools(server);
registerIssueTools(server);
registerEpicTools(server);
registerWikiAndSearchTools(server);

// ─── Start ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Taiga MCP server started (stdio)");
}

main().catch((error: unknown) => {
  logger.error("Failed to start server", { error: String(error) });
  process.exit(1);
});
