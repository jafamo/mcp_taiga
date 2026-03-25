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
} from "../formats.js";
import { logger } from "../logger.js";

export function registerWikiAndSearchTools(server: McpServer): void {
  server.tool(
    "taiga_list_wiki_pages",
    "Lista todas las páginas wiki de un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
    },
    async ({ project_id }) => {
      logger.debug("tool invoked", { tool: "taiga_list_wiki_pages", project_id });
      try {
        const pages = await listWikiPages(project_id);
        if (pages.length === 0) return textResponse("No se encontraron páginas wiki.");
        const lines = pages.map(formatWikiPage).join("\n\n");
        return textResponse(`${pages.length} páginas wiki encontradas:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_wiki_pages", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_wiki_page",
    "Obtiene una página wiki por ID, o por proyecto + slug",
    {
      page_id: z.number().int().positive().optional().describe("ID de la página wiki"),
      project_id: z.number().int().positive().optional().describe("ID del proyecto (necesario si se usa slug)"),
      slug: z.string().optional().describe("Slug de la página wiki"),
    },
    async ({ page_id, project_id, slug }) => {
      logger.debug("tool invoked", { tool: "taiga_get_wiki_page", page_id, project_id, slug });
      try {
        if (!page_id && !(project_id && slug)) {
          return errorResponse("Se requiere page_id, o bien project_id + slug");
        }
        const page = page_id
          ? await getWikiPage(page_id)
          : await getWikiPageBySlug(project_id!, slug!);
        return textResponse(`${formatWikiPage(page)}\n\n**Contenido completo:**\n${page.content}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_wiki_page",
    "Crea una nueva página wiki en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones").describe("Slug de la página (ej: guia-de-uso)"),
      content: z.string().describe("Contenido de la página (soporta Markdown)"),
    },
    async ({ project_id, slug, content }) => {
      logger.debug("tool invoked", { tool: "taiga_create_wiki_page", project_id, slug });
      try {
        const page = await createWikiPage({ project: project_id, slug, content });
        return textResponse(`Página wiki creada:\n\n${formatWikiPage(page)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_wiki_page",
    "Edita el contenido de una página wiki. Obtén la versión actual con taiga_get_wiki_page antes de editar.",
    {
      page_id: z.number().int().positive().describe("ID de la página wiki"),
      version: z.number().int().positive().describe("Versión actual (obtenida del GET previo)"),
      content: z.string().describe("Nuevo contenido completo de la página"),
    },
    async ({ page_id, version, content }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_wiki_page", page_id, version });
      try {
        const page = await editWikiPage(page_id, version, content);
        return textResponse(`Página wiki actualizada:\n\n${formatWikiPage(page)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_wiki_page", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_search",
    "Búsqueda global de texto en un proyecto (busca en epics, user stories, issues, tareas y wiki)",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      text: z.string().min(1).describe("Texto a buscar"),
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
          sections.push(`**Tareas (${result.tasks.length}):**\n${result.tasks.map(formatTask).join("\n\n")}`);
        }
        if (result.wikipages.length > 0) {
          sections.push(`**Wiki (${result.wikipages.length}):**\n${result.wikipages.map(formatWikiPage).join("\n\n")}`);
        }

        if (sections.length === 0) return textResponse(`Sin resultados para "${text}".`);
        return textResponse(`Búsqueda: ${result.count} resultados para "${text}"\n\n${sections.join("\n\n---\n\n")}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_search", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
