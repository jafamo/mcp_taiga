import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listUserStories, getUserStory, createUserStory, editUserStory, deleteUserStory } from "../services/taiga.js";
import { textResponse, errorResponse, formatUserStory } from "../formats.js";
import { logger } from "../logger.js";

export function registerUserStoryTools(server: McpServer): void {
  server.tool(
    "taiga_list_userstories",
    "Lista user stories con filtros opcionales",
    {
      project_id: z.number().int().positive().optional().describe("ID del proyecto"),
      milestone_id: z.number().int().positive().optional().describe("Filtrar por sprint (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filtrar por usuario asignado (ID)"),
      status: z.number().int().positive().optional().describe("Filtrar por estado (ID)"),
      tags: z.string().optional().describe("Filtrar por tags (separadas por coma)"),
    },
    async ({ project_id, milestone_id, assigned_to, status, tags }) => {
      logger.debug("tool invoked", { tool: "taiga_list_userstories", project_id, milestone_id });
      try {
        const stories = await listUserStories({
          project: project_id,
          milestone: milestone_id,
          assigned_to,
          status,
          tags,
        });
        if (stories.length === 0) return textResponse("No se encontraron user stories.");
        const lines = stories.map(formatUserStory).join("\n\n");
        return textResponse(`${stories.length} user stories encontradas:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_userstories", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_userstory",
    "Obtiene los detalles completos de una user story por ID",
    {
      userstory_id: z.number().int().positive().describe("ID de la user story"),
    },
    async ({ userstory_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_userstory", userstory_id });
      try {
        const us = await getUserStory(userstory_id);
        const header = formatUserStory(us);
        const desc = us.description ? `\n\n**Descripción:**\n${us.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_userstory",
    "Crea una nueva user story en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      subject: z.string().min(1).describe("Título de la user story"),
      description: z.string().optional().describe("Descripción detallada"),
      milestone_id: z.number().int().positive().optional().describe("Sprint al que asignar (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Usuario asignado (ID)"),
      tags: z.array(z.string()).optional().describe("Lista de tags"),
      status: z.number().int().positive().optional().describe("Estado inicial (ID)"),
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
        return textResponse(`User story creada:\n\n${formatUserStory(us)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_userstory",
    "Edita una user story existente. Obtén la versión actual con taiga_get_userstory antes de editar.",
    {
      userstory_id: z.number().int().positive().describe("ID de la user story"),
      version: z.number().int().positive().describe("Versión actual (obtenida del GET previo)"),
      subject: z.string().optional().describe("Nuevo título"),
      description: z.string().optional().describe("Nueva descripción"),
      milestone_id: z.number().int().positive().nullable().optional().describe("Nuevo sprint (null = backlog)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("Nuevo asignado (null = nadie)"),
      status: z.number().int().positive().optional().describe("Nuevo estado (ID)"),
      tags: z.array(z.string()).optional().describe("Nueva lista de tags"),
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
        return textResponse(`User story actualizada:\n\n${formatUserStory(us)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_userstory",
    "Elimina una user story permanentemente",
    {
      userstory_id: z.number().int().positive().describe("ID de la user story a eliminar"),
    },
    async ({ userstory_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_userstory", userstory_id });
      try {
        await deleteUserStory(userstory_id);
        return textResponse(`User story eliminada (id: ${userstory_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_userstory", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
