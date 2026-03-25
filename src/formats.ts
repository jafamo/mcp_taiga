import type {
  TaigaProject,
  TaigaMilestone,
  TaigaUserStory,
  TaigaTask,
  TaigaIssue,
  TaigaEpic,
  TaigaWikiPage,
  ToolTextResponse,
} from "./types.js";
import { TaigaApiError } from "./errors.js";
import type { PagedResult } from "./services/taiga.js";

// ─── Text Response Builder ────────────────────────────────────────────────────

export function textResponse(text: string): ToolTextResponse {
  return { content: [{ type: "text", text }] };
}

export function errorResponse(error: unknown): ToolTextResponse {
  if (error instanceof TaigaApiError) {
    return textResponse(`Error ${error.status}: ${error.message}`);
  }
  const message = error instanceof Error ? error.message : String(error);
  return textResponse(`Error: ${message}`);
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function formatPaginationHeader(result: PagedResult<unknown>, label: string): string {
  const totalStr = result.total !== null ? ` of ${result.total}` : "";
  const more = result.hasMore ? ` — use page=${result.page + 1} for more` : "";
  return `${result.items.length}${totalStr} ${label} (page ${result.page}, ${result.pageSize} per page)${more}`;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatProject(p: TaigaProject): string {
  return [
    `**[${p.id}] ${p.name}** (slug: ${p.slug})`,
    p.description ? `  ${p.description}` : "",
    `  Private: ${p.is_private ? "Yes" : "No"} | Sprints: ${p.total_milestones}`,
    `  Modules: ${[
      p.is_backlog_activated && "Backlog",
      p.is_kanban_activated && "Kanban",
      p.is_issues_activated && "Issues",
      p.is_wiki_activated && "Wiki",
    ]
      .filter(Boolean)
      .join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatMilestone(m: TaigaMilestone): string {
  const progress =
    m.total_points > 0
      ? `${m.closed_points}/${m.total_points} points (${Math.round((m.closed_points / m.total_points) * 100)}%)`
      : "No points";
  return [
    `**[${m.id}] ${m.name}**`,
    `  Project: ${m.project_extra_info.name} | Closed: ${m.closed ? "Yes" : "No"}`,
    `  Dates: ${m.estimated_start} → ${m.estimated_finish}`,
    `  Progress: ${progress}`,
  ].join("\n");
}

export function formatUserStory(us: TaigaUserStory): string {
  return [
    `**[#${us.ref}] ${us.subject}** (id: ${us.id})`,
    `  Status: ${us.status_extra_info?.name ?? "No status"} | Closed: ${us.is_closed ? "Yes" : "No"}`,
    `  Sprint: ${us.milestone_name ?? "Backlog"} | Assigned: ${us.assigned_to_extra_info?.full_name ?? "Nobody"}`,
    us.tags.length ? `  Tags: ${us.tags.join(", ")}` : "",
    `  Version: ${us.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatTask(t: TaigaTask): string {
  return [
    `**[#${t.ref}] ${t.subject}** (id: ${t.id})`,
    `  Status: ${t.status_extra_info?.name ?? "No status"} | Closed: ${t.is_closed ? "Yes" : "No"}`,
    `  US: ${t.user_story_extra_info ? `#${t.user_story_extra_info.ref} ${t.user_story_extra_info.subject}` : "No US"}`,
    `  Assigned: ${t.assigned_to_extra_info?.full_name ?? "Nobody"}`,
    t.tags.length ? `  Tags: ${t.tags.join(", ")}` : "",
    `  Version: ${t.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatIssue(i: TaigaIssue): string {
  return [
    `**[#${i.ref}] ${i.subject}** (id: ${i.id})`,
    `  Status: ${i.status_extra_info?.name} | Type: ${i.type_extra_info?.name} | Priority: ${i.priority_extra_info?.name}`,
    `  Severity: ${i.severity_extra_info?.name} | Closed: ${i.is_closed ? "Yes" : "No"}`,
    `  Assigned: ${i.assigned_to_extra_info?.full_name ?? "Nobody"}`,
    i.tags.length ? `  Tags: ${i.tags.join(", ")}` : "",
    `  Version: ${i.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatEpic(e: TaigaEpic): string {
  const counts = e.user_stories_counts;
  return [
    `**[#${e.ref}] ${e.subject}** (id: ${e.id}) — color: ${e.color}`,
    `  Status: ${e.status_extra_info?.name ?? "No status"} | Closed: ${e.is_closed ? "Yes" : "No"}`,
    `  User stories: ${counts.progress}/${counts.total}`,
    `  Assigned: ${e.assigned_to_extra_info?.full_name ?? "Nobody"}`,
    e.tags.length ? `  Tags: ${e.tags.join(", ")}` : "",
    `  Version: ${e.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatWikiPage(w: TaigaWikiPage): string {
  const preview = w.content.length > 200 ? w.content.slice(0, 200) + "..." : w.content;
  return [
    `**[${w.id}] ${w.slug}**`,
    `  Project: ${w.project_extra_info.name} | Modified: ${w.modified_date}`,
    `  Content: ${preview}`,
    `  Version: ${w.version}`,
  ].join("\n");
}
