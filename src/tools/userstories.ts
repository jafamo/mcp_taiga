import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listUserStories, getUserStory, createUserStory, editUserStory, deleteUserStory } from "../services/taiga.js";
import { textResponse, errorResponse, formatUserStory, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerUserStoryTools(server: McpServer): void {
  server.tool(
    "taiga_list_userstories",
    "List user stories with optional filters",
    {
      project_id: z.number().int().positive().optional().describe("Project ID"),
      milestone_id: z.number().int().positive().optional().describe("Filter by sprint (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filter by assigned user (ID)"),
      status: z.number().int().positive().optional().describe("Filter by status (ID)"),
      tags: z.string().optional().describe("Filter by tags (comma-separated)"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, milestone_id, assigned_to, status, tags, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_userstories", project_id, milestone_id, page, page_size });
      try {
        const result = await listUserStories({
          project: project_id,
          milestone: milestone_id,
          assigned_to,
          status,
          tags,
          page,
          page_size,
        });
        if (result.items.length === 0) return textResponse("No user stories found.");
        const header = formatPaginationHeader(result, "user stories");
        const lines = result.items.map(formatUserStory).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_userstories", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_userstory",
    "Get full details of a user story by ID",
    {
      userstory_id: z.number().int().positive().describe("User story ID"),
    },
    async ({ userstory_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_userstory", userstory_id });
      try {
        const us = await getUserStory(userstory_id);
        const header = formatUserStory(us);
        const desc = us.description ? `\n\n**Description:**\n${us.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_userstory",
    "Create a new user story in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      subject: z.string().min(1).describe("User story title"),
      description: z.string().optional().describe("Detailed description"),
      milestone_id: z.number().int().positive().optional().describe("Sprint to assign (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Assigned user (ID)"),
      tags: z.array(z.string()).optional().describe("List of tags"),
      status: z.number().int().positive().optional().describe("Initial status (ID)"),
    },
    async ({ project_id, subject, description, milestone_id, assigned_to, tags, status }) => {
      logger.debug("tool invoked", { tool: "taiga_create_userstory", project_id, subject });
      try {
        const us = await createUserStory({
          project: project_id,
          subject,
          description,
          milestone: milestone_id,
          assigned_to,
          tags,
          status,
        });
        return textResponse(`User story created:\n\n${formatUserStory(us)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_userstory",
    "Edit an existing user story. Fetch the current version with taiga_get_userstory before editing.",
    {
      userstory_id: z.number().int().positive().describe("User story ID"),
      version: z.number().int().positive().describe("Current version (obtained from the GET first)"),
      subject: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      milestone_id: z.number().int().positive().nullable().optional().describe("New sprint (null = backlog)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("New assignee (null = nobody)"),
      status: z.number().int().positive().optional().describe("New status (ID)"),
      tags: z.array(z.string()).optional().describe("New list of tags"),
    },
    async ({ userstory_id, version, subject, description, milestone_id, assigned_to, status, tags }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_userstory", userstory_id, version });
      try {
        const us = await editUserStory(userstory_id, version, {
          ...(subject !== undefined && { subject }),
          ...(description !== undefined && { description }),
          ...(milestone_id !== undefined && { milestone: milestone_id }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(status !== undefined && { status }),
          ...(tags !== undefined && { tags }),
        });
        return textResponse(`User story updated:\n\n${formatUserStory(us)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_userstory",
    "Permanently delete a user story",
    {
      userstory_id: z.number().int().positive().describe("User story ID to delete"),
    },
    async ({ userstory_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_userstory", userstory_id });
      try {
        await deleteUserStory(userstory_id);
        return textResponse(`User story deleted (id: ${userstory_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
