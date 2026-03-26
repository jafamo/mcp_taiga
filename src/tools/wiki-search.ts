import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  listWikiPages,
  getWikiPage,
  getWikiPageBySlug,
  createWikiPage,
  editWikiPage,
  searchProject,
} from "../services/taiga.js";
import {
  textResponse,
  errorResponse,
  formatWikiPage,
  formatEpic,
  formatUserStory,
  formatIssue,
  formatTask,
  formatPaginationHeader,
} from "../formats.js";
import { logger } from "../logger.js";

export function registerWikiAndSearchTools(server: McpServer): void {
  server.tool(
    "taiga_list_wiki_pages",
    "List all wiki pages in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_wiki_pages", project_id, page, page_size });
      try {
        const result = await listWikiPages(project_id, page, page_size);
        if (result.items.length === 0) return textResponse("No wiki pages found.");
        const header = formatPaginationHeader(result, "wiki pages");
        const lines = result.items.map(formatWikiPage).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_wiki_pages", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_wiki_page",
    "Get a wiki page by ID, or by project + slug",
    {
      page_id: z.number().int().positive().optional().describe("Wiki page ID"),
      project_id: z.number().int().positive().optional().describe("Project ID (required when using slug)"),
      slug: z.string().optional().describe("Wiki page slug"),
    },
    async ({ page_id, project_id, slug }) => {
      logger.debug("tool invoked", { tool: "taiga_get_wiki_page", page_id, project_id, slug });
      try {
        if (!page_id && !(project_id && slug)) {
          return errorResponse("page_id, or both project_id + slug are required");
        }
        const page = page_id
          ? await getWikiPage(page_id)
          : await getWikiPageBySlug(project_id!, slug!);
        return textResponse(`${formatWikiPage(page)}\n\n**Full content:**\n${page.content}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_wiki_page",
    "Create a new wiki page in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and hyphens only").describe("Page slug (e.g. usage-guide)"),
      content: z.string().describe("Page content (Markdown supported)"),
    },
    async ({ project_id, slug, content }) => {
      logger.debug("tool invoked", { tool: "taiga_create_wiki_page", project_id, slug });
      try {
        const page = await createWikiPage({ project: project_id, slug, content });
        return textResponse(`Wiki page created:\n\n${formatWikiPage(page)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_wiki_page",
    "Edit the content of a wiki page. Fetch the current version with taiga_get_wiki_page before editing.",
    {
      page_id: z.number().int().positive().describe("Wiki page ID"),
      version: z.number().int().positive().describe("Current version (obtained from the GET first)"),
      content: z.string().describe("New full page content"),
    },
    async ({ page_id, version, content }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_wiki_page", page_id, version });
      try {
        const page = await editWikiPage(page_id, version, content);
        return textResponse(`Wiki page updated:\n\n${formatWikiPage(page)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_search",
    "Full-text search across a project (searches epics, user stories, issues, tasks, and wiki)",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      text: z.string().min(1).describe("Text to search for"),
    },
    async ({ project_id, text }) => {
      logger.debug("tool invoked", { tool: "taiga_search", project_id, text });
      try {
        const result = await searchProject(project_id, text);
        const sections: string[] = [];

        if (result.epics.length > 0) {
          sections.push(`**Epics (${result.epics.length}):**\n${result.epics.map(formatEpic).join("\n\n")}`);
        }
        if (result.userstories.length > 0) {
          sections.push(`**User Stories (${result.userstories.length}):**\n${result.userstories.map(formatUserStory).join("\n\n")}`);
        }
        if (result.issues.length > 0) {
          sections.push(`**Issues (${result.issues.length}):**\n${result.issues.map(formatIssue).join("\n\n")}`);
        }
        if (result.tasks.length > 0) {
          sections.push(`**Tasks (${result.tasks.length}):**\n${result.tasks.map(formatTask).join("\n\n")}`);
        }
        if (result.wikipages.length > 0) {
          sections.push(`**Wiki (${result.wikipages.length}):**\n${result.wikipages.map(formatWikiPage).join("\n\n")}`);
        }

        if (sections.length === 0) return textResponse(`No results for "${text}".`);
        return textResponse(`Search: ${result.count} results for "${text}"\n\n${sections.join("\n\n---\n\n")}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_search", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
