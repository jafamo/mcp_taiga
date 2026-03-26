import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listMilestones, getMilestone, createMilestone } from "../services/taiga.js";
import { textResponse, errorResponse, formatMilestone, formatUserStory, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerMilestoneTools(server: McpServer): void {
  server.tool(
    "taiga_list_milestones",
    "List sprints in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      closed: z.boolean().optional().describe("true = closed only, false = open only, omit = all"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, closed, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_milestones", project_id, closed, page, page_size });
      try {
        const result = await listMilestones(project_id, closed, page, page_size);
        if (result.items.length === 0) return textResponse("No sprints found.");
        const header = formatPaginationHeader(result, "sprints");
        const lines = result.items.map(formatMilestone).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_milestones", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_milestone",
    "Get details of a sprint by ID, including its user stories",
    {
      milestone_id: z.number().int().positive().describe("Sprint ID"),
    },
    async ({ milestone_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_milestone", milestone_id });
      try {
        const milestone = await getMilestone(milestone_id);
        const header = formatMilestone(milestone);
        const stories = milestone.user_stories ?? [];
        if (stories.length === 0) return textResponse(`${header}\n\nNo user stories.`);
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
    "Create a new sprint in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      name: z.string().min(1).describe("Sprint name"),
      estimated_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").describe("Start date"),
      estimated_finish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD").describe("End date"),
    },
    async ({ project_id, name, estimated_start, estimated_finish }) => {
      logger.debug("tool invoked", { tool: "taiga_create_milestone", project_id, name });
      try {
        const milestone = await createMilestone({ project: project_id, name, estimated_start, estimated_finish });
        return textResponse(`Sprint created:\n\n${formatMilestone(milestone)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_milestone", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
