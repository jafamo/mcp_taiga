import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listTasks, getTask, createTask, editTask, deleteTask } from "../services/taiga.js";
import { textResponse, errorResponse, formatTask, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerTaskTools(server: McpServer): void {
  server.tool(
    "taiga_list_tasks",
    "List tasks with optional filters",
    {
      project_id: z.number().int().positive().optional().describe("Project ID"),
      milestone_id: z.number().int().positive().optional().describe("Filter by sprint (ID)"),
      userstory_id: z.number().int().positive().optional().describe("Filter by user story (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filter by assigned user (ID)"),
      status: z.number().int().positive().optional().describe("Filter by status (ID)"),
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
    "Get full details of a task by ID",
    {
      task_id: z.number().int().positive().describe("Task ID"),
    },
    async ({ task_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_task", task_id });
      try {
        const task = await getTask(task_id);
        const header = formatTask(task);
        const desc = task.description ? `\n\n**Description:**\n${task.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_task",
    "Create a new task in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      subject: z.string().min(1).describe("Task title"),
      description: z.string().optional().describe("Detailed description"),
      userstory_id: z.number().int().positive().optional().describe("User story this task belongs to (ID)"),
      milestone_id: z.number().int().positive().optional().describe("Sprint to assign (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Assigned user (ID)"),
      tags: z.array(z.string()).optional().describe("List of tags"),
      status: z.number().int().positive().optional().describe("Initial status (ID)"),
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
        return textResponse(`Task created:\n\n${formatTask(task)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_task",
    "Edit an existing task. Fetch the current version with taiga_get_task before editing.",
    {
      task_id: z.number().int().positive().describe("Task ID"),
      version: z.number().int().positive().describe("Current version (obtained from the GET first)"),
      subject: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      userstory_id: z.number().int().positive().nullable().optional().describe("New user story (null = no US)"),
      milestone_id: z.number().int().positive().nullable().optional().describe("New sprint (null = no sprint)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("New assignee (null = nobody)"),
      status: z.number().int().positive().optional().describe("New status (ID)"),
      tags: z.array(z.string()).optional().describe("New list of tags"),
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
        return textResponse(`Task updated:\n\n${formatTask(task)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_task",
    "Permanently delete a task",
    {
      task_id: z.number().int().positive().describe("Task ID to delete"),
    },
    async ({ task_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_task", task_id });
      try {
        await deleteTask(task_id);
        return textResponse(`Task deleted (id: ${task_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_task", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
