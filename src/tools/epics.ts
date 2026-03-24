import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listEpics, getEpic, createEpic, editEpic } from "../services/taiga.js";
import { textResponse, errorResponse, formatEpic } from "../formats.js";

export function registerEpicTools(server: McpServer): void {
  server.tool(
    "taiga_list_epics",
    "Lista todos los epics de un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
    },
    async ({ project_id }) => {
      try {
        const epics = await listEpics(project_id);
        if (epics.length === 0) return textResponse("No se encontraron epics.");
        const lines = epics.map(formatEpic).join("\n\n");
        return textResponse(`${epics.length} epics encontrados:\n\n${lines}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_epic",
    "Obtiene los detalles completos de un epic por ID",
    {
      epic_id: z.number().int().positive().describe("ID del epic"),
    },
    async ({ epic_id }) => {
      try {
        const epic = await getEpic(epic_id);
        const header = formatEpic(epic);
        const desc = epic.description ? `\n\n**Descripción:**\n${epic.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_epic",
    "Crea un nuevo epic en un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
      subject: z.string().min(1).describe("Título del epic"),
      description: z.string().optional().describe("Descripción detallada"),
      assigned_to: z.number().int().positive().optional().describe("Usuario asignado (ID)"),
      tags: z.array(z.string()).optional().describe("Lista de tags"),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Color en formato hex (#RRGGBB)"),
      status: z.number().int().positive().optional().describe("Estado inicial (ID)"),
    },
    async ({ project_id, subject, description, assigned_to, tags, color, status }) => {
      try {
        const epic = await createEpic({ project: project_id, subject, description, assigned_to, tags, color, status });
        return textResponse(`Epic creado:\n\n${formatEpic(epic)}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_epic",
    "Edita un epic existente. Obtén la versión actual con taiga_get_epic antes de editar.",
    {
      epic_id: z.number().int().positive().describe("ID del epic"),
      version: z.number().int().positive().describe("Versión actual (obtenida del GET previo)"),
      subject: z.string().optional().describe("Nuevo título"),
      description: z.string().optional().describe("Nueva descripción"),
      assigned_to: z.number().int().positive().nullable().optional().describe("Nuevo asignado (null = nadie)"),
      status: z.number().int().positive().optional().describe("Nuevo estado (ID)"),
      tags: z.array(z.string()).optional().describe("Nueva lista de tags"),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe("Nuevo color en formato hex (#RRGGBB)"),
    },
    async ({ epic_id, version, subject, description, assigned_to, status, tags, color }) => {
      try {
        const epic = await editEpic(epic_id, version, {
          ...(subject !== undefined && { subject }),
          ...(description !== undefined && { description }),
          ...(assigned_to !== undefined && { assigned_to }),
          ...(status !== undefined && { status }),
          ...(tags !== undefined && { tags }),
          ...(color !== undefined && { color }),
        });
        return textResponse(`Epic actualizado:\n\n${formatEpic(epic)}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
