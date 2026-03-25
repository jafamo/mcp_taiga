import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listEpics, getEpic, createEpic, editEpic } from "../services/taiga.js";
import { textResponse, errorResponse, formatEpic, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerEpicTools(server: McpServer): void {
  server.tool(
    "taiga_list_epics",
    "List all epics in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_epics", project_id, page, page_size });
      try {
        const result = await listEpics(project_id, page, page_size);
        if (result.items.length === 0) return textResponse("No epics found.");
        const header = formatPaginationHeader(result, "epics");
        const lines = result.items.map(formatEpic).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_epics", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_epic",
    "Get full details of an epic by ID",
    {
      epic_id: z.number().int().positive().describe("Epic ID"),
    },
    async ({ epic_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_epic", epic_id });
      try {
        const epic = await getEpic(epic_id);
        const header = formatEpic(epic);
        const desc = epic.description ? `\n\n**Description:**\n${epic.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_epic", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_epic",
    "Create a new epic in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      subject: z.string().min(1).describe("Epic title"),
      description: z.string().optional().describe("Detailed description"),
      assigned_to: z.number().int().positive().optional().describe("Assigned user (ID)"),
      tags: z.array(z.string()).optional().describe("List of tags"),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Color in hex format (#RRGGBB)"),
      status: z.number().int().positive().optional().describe("Initial status (ID)"),
    },
    async ({ project_id, subject, description, assigned_to, tags, color, status }) => {
      logger.debug("tool invoked", { tool: "taiga_create_epic", project_id, subject });
      try {
        const epic = await createEpic({ project: project_id, subject, description, assigned_to, tags, color, status });
        return textResponse(`Epic created:\n\n${formatEpic(epic)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_epic", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_epic",
    "Edit an existing epic. Fetch the current version with taiga_get_epic before editing.",
    {
      epic_id: z.number().int().positive().describe("Epic ID"),
      version: z.number().int().positive().describe("Current version (obtained from the GET first)"),
      subject: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      assigned_to: z.number().int().positive().nullable().optional().describe("New assignee (null = nobody)"),
      status: z.number().int().positive().optional().describe("New status (ID)"),
      tags: z.array(z.string()).optional().describe("New list of tags"),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("New color in hex format (#RRGGBB)"),
    },
    async ({ epic_id, version, subject, description, assigned_to, status, tags, color }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_epic", epic_id, version });
      try {
        const epic = await editEpic(epic_id, version, {
          ...(subject !== undefined && { subject }),
          ...(description !== undefined && { description }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(status !== undefined && { status }),
          ...(tags !== undefined && { tags }),
          ...(color !== undefined && { color }),
        });
        return textResponse(`Epic updated:\n\n${formatEpic(epic)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_epic", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
