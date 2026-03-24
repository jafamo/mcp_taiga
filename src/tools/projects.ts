import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listProjects, getProject, getProjectBySlug, createProject, listMembers } from "../services/taiga.js";
import { textResponse, errorResponse, formatProject } from "../formats.js";

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "taiga_list_projects",
    "Lista todos los proyectos de Taiga accesibles",
    {},
    async () => {
      try {
        const projects = await listProjects();
        if (projects.length === 0) return textResponse("No se encontraron proyectos.");
        const lines = projects.map(formatProject).join("\n\n");
        return textResponse(`${projects.length} proyectos encontrados:\n\n${lines}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_project",
    "Obtiene detalles de un proyecto por ID o slug",
    {
      project_id: z.number().int().positive().optional().describe("ID numérico del proyecto"),
      slug: z.string().optional().describe("Slug del proyecto"),
    },
    async ({ project_id, slug }) => {
      try {
        if (!project_id && !slug) return errorResponse("Se requiere project_id o slug");
        const project = project_id
          ? await getProject(project_id)
          : await getProjectBySlug(slug!);
        return textResponse(formatProject(project));
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_project",
    "Crea un nuevo proyecto en Taiga",
    {
      name: z.string().min(1).describe("Nombre del proyecto"),
      description: z.string().optional().describe("Descripción del proyecto"),
      is_private: z.boolean().optional().describe("Si el proyecto es privado (por defecto: false)"),
    },
    async ({ name, description, is_private }) => {
      try {
        const project = await createProject({ name, description, is_private: is_private ?? false });
        return textResponse(`Proyecto creado:\n\n${formatProject(project)}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_list_members",
    "Lista los miembros de un proyecto",
    {
      project_id: z.number().int().positive().describe("ID del proyecto"),
    },
    async ({ project_id }) => {
      try {
        const members = await listMembers(project_id);
        if (members.length === 0) return textResponse("El proyecto no tiene miembros.");
        const lines = members.map((m) => `  [${m.id}] ${m.username} — ${m.full_name}`).join("\n");
        return textResponse(`${members.length} miembros:\n\n${lines}`);
      } catch (error) {
        return errorResponse(error);
      }
    }
  );
}
