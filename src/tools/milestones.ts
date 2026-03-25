import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listMilestones, getMilestone, createMilestone } from "../services/taiga.js";
import { textResponse, errorResponse, formatMilestone, formatUserStory } from "../formats.js";
import { logger } from "../logger.js";

export function registerMilestoneTools(server: McpServer): void {
  server.tool(
    "taiga_list_milestones",
    "Lista los sprints de un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      closed: z.boolean().optional().describe("true = sólo cerrados, false = sólo abiertos, omitir = todos"),
    },
    async ({ project_id, closed }) => {
      logger.debug("tool invoked", { tool: "taiga_list_milestones", project_id, closed });
      try {
        const milestones = await listMilestones(project_id, closed);
        if (milestones.length === 0) return textResponse("No se encontraron sprints.");
        const lines = milestones.map(formatMilestone).join("\n\n");
        return textResponse(`${milestones.length} sprints encontrados:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_milestones", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_milestone",
    "Obtiene detalles de un sprint por ID, incluyendo sus user stories",
    {
      milestone_id: z.number().int().positive().describe("ID del sprint"),
    },
    async ({ milestone_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_milestone", milestone_id });
      try {
        const milestone = await getMilestone(milestone_id);
        const header = formatMilestone(milestone);
        const stories = milestone.user_stories ?? [];
        if (stories.length === 0) return textResponse(`${header}\n\nSin user stories.`);
        const lines = stories.map(formatUserStory).join("\n\n");
        return textResponse(`${header}\n\n${stories.length} user stories:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_milestone", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_milestone",
    "Crea un nuevo sprint en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      name: z.string().min(1).describe("Nombre del sprint"),
      estimated_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").describe("Fecha de inicio"),
      estimated_finish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD").describe("Fecha de fin"),
    },
    async ({ project_id, name, estimated_start, estimated_finish }) => {
      logger.debug("tool invoked", { tool: "taiga_create_milestone", project_id, name });
      try {
        const milestone = await createMilestone({ project: project_id, name, estimated_start, estimated_finish });
        return textResponse(`Sprint creado:\n\n${formatMilestone(milestone)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_milestone", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
