import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { configure } from "./services/taiga.js";
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
  console.error("❌ Variables de entorno requeridas:");
  console.error("   TAIGA_URL        - URL base de tu instancia Taiga (ej: https://taiga.jfarinos.keenetic.pro)");
  console.error("   TAIGA_AUTH_TOKEN - Token de autenticación de Taiga");
  console.error("");
  console.error("Para obtener el token:");
  console.error("  curl -s -X POST <TAIGA_URL>/api/v1/auth \\");
  console.error('    -H "Content-Type: application/json" \\');
  console.error("    -d '{\"type\":\"normal\",\"username\":\"<user>\",\"password\":\"<pass>\"}' | grep auth_token");
  process.exit(1);
}

configure(TAIGA_URL, TAIGA_AUTH_TOKEN);

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
  console.error("✅ Taiga MCP server iniciado (stdio)");
}

main().catch((error: unknown) => {
  console.error("Error al iniciar el servidor:", error);
  process.exit(1);
});
