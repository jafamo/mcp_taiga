import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { listIssues, getIssue, createIssue, editIssue, deleteIssue } from "../services/taiga.js";
import { textResponse, errorResponse, formatIssue, formatPaginationHeader } from "../formats.js";
import { logger } from "../logger.js";

export function registerIssueTools(server: McpServer): void {
  server.tool(
    "taiga_list_issues",
    "List issues with optional filters",
    {
      project_id: z.number().int().positive().optional().describe("Project ID"),
      milestone_id: z.number().int().positive().optional().describe("Filter by sprint (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Filter by assigned user (ID)"),
      status: z.number().int().positive().optional().describe("Filter by status (ID)"),
      type: z.number().int().positive().optional().describe("Filter by type (ID)"),
      priority: z.number().int().positive().optional().describe("Filter by priority (ID)"),
      severity: z.number().int().positive().optional().describe("Filter by severity (ID)"),
      page: z.number().int().positive().optional().default(1).describe("Page number (default: 1)"),
      page_size: z.number().int().positive().max(500).optional().default(100).describe("Results per page (default: 100, max: 500)"),
    },
    async ({ project_id, milestone_id, assigned_to, status, type, priority, severity, page, page_size }) => {
      logger.debug("tool invoked", { tool: "taiga_list_issues", project_id, milestone_id, page, page_size });
      try {
        const result = await listIssues({
          project: project_id,
          milestone: milestone_id,
          assigned_to,
          status,
          type,
          priority,
          severity,
          page,
          page_size,
        });
        if (result.items.length === 0) return textResponse("No issues found.");
        const header = formatPaginationHeader(result, "issues");
        const lines = result.items.map(formatIssue).join("\n\n");
        return textResponse(`${header}\n\n${lines}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_list_issues", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_get_issue",
    "Get full details of an issue by ID",
    {
      issue_id: z.number().int().positive().describe("Issue ID"),
    },
    async ({ issue_id }) => {
      logger.debug("tool invoked", { tool: "taiga_get_issue", issue_id });
      try {
        const issue = await getIssue(issue_id);
        const header = formatIssue(issue);
        const desc = issue.description ? `\n\n**Description:**\n${issue.description}` : "";
        return textResponse(`${header}${desc}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_get_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_create_issue",
    "Create a new issue in a project",
    {
      project_id: z.number().int().positive().describe("Project ID"),
      subject: z.string().min(1).describe("Issue title"),
      description: z.string().optional().describe("Detailed description"),
      milestone_id: z.number().int().positive().optional().describe("Sprint to assign (ID)"),
      assigned_to: z.number().int().positive().optional().describe("Assigned user (ID)"),
      tags: z.array(z.string()).optional().describe("List of tags"),
      status: z.number().int().positive().optional().describe("Initial status (ID)"),
      type: z.number().int().positive().optional().describe("Issue type (ID)"),
      priority: z.number().int().positive().optional().describe("Priority (ID)"),
      severity: z.number().int().positive().optional().describe("Severity (ID)"),
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
        return textResponse(`Issue created:\n\n${formatIssue(issue)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_create_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_edit_issue",
    "Edit an existing issue. Fetch the current version with taiga_get_issue before editing.",
    {
      issue_id: z.number().int().positive().describe("Issue ID"),
      version: z.number().int().positive().describe("Current version (obtained from the GET first)"),
      subject: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      milestone_id: z.number().int().positive().nullable().optional().describe("New sprint (null = no sprint)"),
      assigned_to: z.number().int().positive().nullable().optional().describe("New assignee (null = nobody)"),
      status: z.number().int().positive().optional().describe("New status (ID)"),
      type: z.number().int().positive().optional().describe("New type (ID)"),
      priority: z.number().int().positive().optional().describe("New priority (ID)"),
      severity: z.number().int().positive().optional().describe("New severity (ID)"),
      tags: z.array(z.string()).optional().describe("New list of tags"),
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
        return textResponse(`Issue updated:\n\n${formatIssue(issue)}`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_edit_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );

  server.tool(
    "taiga_delete_issue",
    "Permanently delete an issue",
    {
      issue_id: z.number().int().positive().describe("Issue ID to delete"),
    },
    async ({ issue_id }) => {
      logger.debug("tool invoked", { tool: "taiga_delete_issue", issue_id });
      try {
        await deleteIssue(issue_id);
        return textResponse(`Issue deleted (id: ${issue_id})`);
      } catch (error) {
        logger.error("tool failed", { tool: "taiga_delete_issue", error: String(error) });
        return errorResponse(error);
      }
    }
  );
}
