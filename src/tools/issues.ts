import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listIssues, getIssue, createIssue, editIssue, deleteIssue } from "../services/taiga.js";
import { textResponse, errorResponse, formatIssue } from "../formats.js";
import { logger } from "../logger.js";

export function registerIssueTools(server: McpServer): void {
  server.tool(
    "taiga_list_issues",
    "Lista issues con filtros opcionales",
    {
      project_id: z.number().int().positive().optional().describe("ID del proyecto"),
      milestone_id: z.number().int().positive().optional().describe("Filtrar por sprint (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filtrar por usuario asignado (ID)"),
      status: z.number().int().positive().optional().describe("Filtrar por estado (ID)"),
      type: z.number().int().positive().optional().describe("Filtrar por tipo (ID)"),
      priority: z.number().int().positive().optional().describe("Filtrar por prioridad (ID)"),
      severity: z.number().int().positive().optional().describe("Filtrar por severidad (ID)"),
    },
    async ({ project_id, milestone_id, assigned_to, status, type, priority, severity }) => {
      logger.debug("tool invoked", { tool: "taiga_list_issues", project_id, milestone_id });
      try {
        const issues = await listIssues({
          project: project_id,
          milestone: milestone_id,
          assigned_to,
          status,
          type,
          priority,
          severity,
        });
        if (issues.length === 0) return textResponse("No se encontraron issues.");
        const lines = issues.map(formatIssue).join("\n\n");
        return textResponse(`${issues.length} issues encontrados:\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_issues", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_issue",
    "Obtiene los detalles completos de un issue por ID",
    {
      issue_id: z.number().int().positive().describe("ID del issue"),
    },
    async ({ issue_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_issue", issue_id });
      try {
        const issue = await getIssue(issue_id);
        const header = formatIssue(issue);
        const desc = issue.description ? `\n\n**Descripción:**\n${issue.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_issue",
    "Crea un nuevo issue en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      subject: z.string().min(1).describe("Título del issue"),
      description: z.string().optional().describe("Descripción detallada"),
      milestone_id: z.number().int().positive().optional().describe("Sprint al que asignar (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Usuario asignado (ID)"),
      tags: z.array(z.string()).optional().describe("Lista de tags"),
      status: z.number().int().positive().optional().describe("Estado inicial (ID)"),
      type: z.number().int().positive().optional().describe("Tipo de issue (ID)"),
      priority: z.number().int().positive().optional().describe("Prioridad (ID)"),
      severity: z.number().int().positive().optional().describe("Severidad (ID)"),
    },
    async ({ project_id, subject, description, milestone_id, assigned_to, tags, status, type, priority, severity }) => {
      logger.debug("tool invoked", { tool: "taiga_create_issue", project_id, subject });
      try {
        const issue = await createIssue({
          project: project_id,
          subject,
          description,
          milestone: milestone_id,
          assigned_to,
          tags,
          status,
          type,
          priority,
          severity,
        });
        return textResponse(`Issue creado:\n\n${formatIssue(issue)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_issue",
    "Edita un issue existente. Obtén la versión actual con taiga_get_issue antes de editar.",
    {
      issue_id: z.number().int().positive().describe("ID del issue"),
      version: z.number().int().positive().describe("Versión actual (obtenida del GET previo)"),
      subject: z.string().optional().describe("Nuevo título"),
      description: z.string().optional().describe("Nueva descripción"),
      milestone_id: z.number().int().positive().nullable().optional().describe("Nuevo sprint (null = sin sprint)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("Nuevo asignado (null = nadie)"),
      status: z.number().int().positive().optional().describe("Nuevo estado (ID)"),
      type: z.number().int().positive().optional().describe("Nuevo tipo (ID)"),
      priority: z.number().int().positive().optional().describe("Nueva prioridad (ID)"),
      severity: z.number().int().positive().optional().describe("Nueva severidad (ID)"),
      tags: z.array(z.string()).optional().describe("Nueva lista de tags"),
    },
    async ({ issue_id, version, subject, description, milestone_id, assigned_to, status, type, priority, severity, tags }) => {
      logger.debug("tool invoked", { tool: "taiga_edit_issue", issue_id, version });
      try {
        const issue = await editIssue(issue_id, version, {
          ...(subject !== undefined && { subject }),
          ...(description !== undefined && { description }),
          ...(milestone_id !== undefined && { milestone: milestone_id }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(status !== undefined && { status }),
          ...(type !== undefined && { type }),
          ...(priority !== undefined && { priority }),
          ...(severity !== undefined && { severity }),
          ...(tags !== undefined && { tags }),
        });
        return textResponse(`Issue actualizado:\n\n${formatIssue(issue)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_issue",
    "Elimina un issue permanentemente",
    {
      issue_id: z.number().int().positive().describe("ID del issue a eliminar"),
    },
    async ({ issue_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_issue", issue_id });
      try {
        await deleteIssue(issue_id);
        return textResponse(`Issue eliminado (id: ${issue_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
