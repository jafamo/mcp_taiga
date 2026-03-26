import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listProjects, getProject, getProjectBySlug, createProject, listMembers } from "../services/taiga.js";
import { textResponse, errorResponse, formatProject, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "taiga_list_projects",
    "List all accessible Taiga projects",
    {
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_projects", page, page_size });
      try {
        const result = await listProjects(undefined, page, page_size);
        if (result.items.length === 0) return textResponse("No projects found.");
        const header = formatPaginationHeader(result, "projects");
        const lines = result.items.map(formatProject).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_projects", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_project",
    "Get details of a project by ID or slug",
    {
      project_id: z.number().int().positive().optional().describe("Numeric project ID"),
      slug: z.string().optional().describe("Project slug"),
    },
    async ({ project_id, slug }) => {
      logger.debug("tool invoked", { tool: "taiga_get_project", project_id, slug });
      try {
        if (!project_id && !slug) return errorResponse("project_id or slug is required");
        const project = project_id
          ? await getProject(project_id)
          : await getProjectBySlug(slug!);
        return textResponse(formatProject(project));
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_project", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_project",
    "Create a new project in Taiga",
    {
      name: z.string().min(1).describe("Project name"),
      description: z.string().optional().describe("Project description"),
      is_private: z.boolean().optional().describe("Whether the project is private (default: false)"),
    },
    async ({ name, description, is_private }) => {
      logger.debug("tool invoked", { tool: "taiga_create_project", name });
      try {
        const project = await createProject({ name, description, is_private: is_private ?? false });
        return textResponse(`Project created:\n\n${formatProject(project)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_project", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_list_members",
    "List the members of a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
    },
    async ({ project_id }) => {
      logger.debug("tool invoked", { tool: "taiga_list_members", project_id });
      try {
        const members = await listMembers(project_id);
        if (members.length === 0) return textResponse("No members found in this project.");
        const lines = members.map((m) => `  [${m.id}] ${m.username} — ${m.full_name}`).join("\n");
        return textResponse(`${members.length} members:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_members", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
