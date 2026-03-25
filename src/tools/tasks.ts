import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTasks, getTask, createTask, editTask, deleteTask } from "../services/taiga.js";
import { textResponse, errorResponse, formatTask, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerTaskTools(server: McpServer): void {
  server.tool(
    "taiga_list_tasks",
    "Lista tareas con filtros opcionales",
    {
      project_id: z.number().int().positive().optional().describe("ID del proyecto"),
      milestone_id: z.number().int().positive().optional().describe("Filtrar por sprint (ID)"),
      userstory_id: z.number().int().positive().optional().describe("Filtrar por user story (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filtrar por usuario asignado (ID)"),
      status: z.number().int().positive().optional().describe("Filtrar por estado (ID)"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, milestone_id, userstory_id, assigned_to, status, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_tasks", project_id, milestone_id, page, page_size });
      try {
        const result = await listTasks({
          project: project_id,
          milestone: milestone_id,
          user_story: userstory_id,
          assigned_to,
          status,
          page,
          page_size,
        });
        if (result.items.length === 0) return textResponse("No tasks found.");
        const header = formatPaginationHeader(result, "tasks");
        const lines = result.items.map(formatTask).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_tasks", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_task",
    "Obtiene los detalles completos de una tarea por ID",
    {
      task_id: z.number().int().positive().describe("ID de la tarea"),
    },
    async ({ task_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_task", task_id });
      try {
        const task = await getTask(task_id);
        const header = formatTask(task);
        const desc = task.description ? `\n\n**Descripción:**\n${task.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_task",
    "Crea una nueva tarea en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      subject: z.string().min(1).describe("Título de la tarea"),
      description: z.string().optional().describe("Descripción detallada"),
      userstory_id: z.number().int().positive().optional().describe("User story a la que pertenece (ID)"),
      milestone_id: z.number().int().positive().optional().describe("Sprint al que asignar (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Usuario asignado (ID)"),
      tags: z.array(z.string()).optional().describe("Lista de tags"),
      status: z.number().int().positive().optional().describe("Estado inicial (ID)"),
    },
    async ({ project_id, subject, description, userstory_id, milestone_id, assigned_to, tags, status }) => {
      logger.debug("tool invoked", { tool: "taiga_create_task", project_id, subject });
      try {
        const task = await createTask({
          project: project_id,
          subject,
          description,
          user_story: userstory_id,
          milestone: milestone_id,
          assigned_to,
          tags,
          status,
        });
        return textResponse(`Tarea creada:\n\n${formatTask(task)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_task",
    "Edita una tarea existente. Obtén la versión actual con taiga_get_task antes de editar.",
    {
      task_id: z.number().int().positive().describe("ID de la tarea"),
      version: z.number().int().positive().describe("Versión actual (obtenida del GET previo)"),
      subject: z.string().optional().describe("Nuevo título"),
      description: z.string().optional().describe("Nueva descripción"),
      userstory_id: z.number().int().positive().nullable().optional().describe("Nueva user story (null = sin US)"),
      milestone_id: z.number().int().positive().nullable().optional().describe("Nuevo sprint (null = sin sprint)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("Nuevo asignado (null = nadie)"),
      status: z.number().int().positive().optional().describe("Nuevo estado (ID)"),
      tags: z.array(z.string()).optional().describe("Nueva lista de tags"),
    },
    async ({ task_id, version, subject, description, userstory_id, milestone_id, assigned_to, status, tags }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_task", task_id, version });
      try {
        const task = await editTask(task_id, version, {
          ...(subject !== undefined && { subject }),
          ...(description !== undefined && { description }),
          ...(userstory_id !== undefined && { user_story: userstory_id }),
          ...(milestone_id !== undefined && { milestone: milestone_id }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(status !== undefined && { status }),
          ...(tags !== undefined && { tags }),
        });
        return textResponse(`Tarea actualizada:\n\n${formatTask(task)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_task",
    "Elimina una tarea permanentemente",
    {
      task_id: z.number().int().positive().describe("ID de la tarea a eliminar"),
    },
    async ({ task_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_task", task_id });
      try {
        await deleteTask(task_id);
        return textResponse(`Tarea eliminada (id: ${task_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
