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

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatProject(p: TaigaProject): string {
  return [
    `**[${p.id}] ${p.name}** (slug: ${p.slug})`,
    p.description ? `  ${p.description}` : "",
    `  Privado: ${p.is_private ? "Sí" : "No"} | Sprints: ${p.total_milestones}`,
    `  Módulos: ${[
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
      ? `${m.closed_points}/${m.total_points} puntos (${Math.round((m.closed_points / m.total_points) * 100)}%)`
      : "Sin puntos";
  return [
    `**[${m.id}] ${m.name}**`,
    `  Proyecto: ${m.project_extra_info.name} | Cerrado: ${m.closed ? "Sí" : "No"}`,
    `  Fechas: ${m.estimated_start} → ${m.estimated_finish}`,
    `  Progreso: ${progress}`,
  ].join("\n");
}

export function formatUserStory(us: TaigaUserStory): string {
  return [
    `**[#${us.ref}] ${us.subject}** (id: ${us.id})`,
    `  Estado: ${us.status_extra_info?.name ?? "Sin estado"} | Cerrada: ${us.is_closed ? "Sí" : "No"}`,
    `  Sprint: ${us.milestone_name ?? "Backlog"} | Asignada: ${us.assigned_to_extra_info?.full_name ?? "Nadie"}`,
    us.tags.length ? `  Tags: ${us.tags.join(", ")}` : "",
    `  Versión: ${us.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatTask(t: TaigaTask): string {
  return [
    `**[#${t.ref}] ${t.subject}** (id: ${t.id})`,
    `  Estado: ${t.status_extra_info?.name ?? "Sin estado"} | Cerrada: ${t.is_closed ? "Sí" : "No"}`,
    `  US: ${t.user_story_extra_info ? `#${t.user_story_extra_info.ref} ${t.user_story_extra_info.subject}` : "Sin US"}`,
    `  Asignada: ${t.assigned_to_extra_info?.full_name ?? "Nadie"}`,
    t.tags.length ? `  Tags: ${t.tags.join(", ")}` : "",
    `  Versión: ${t.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatIssue(i: TaigaIssue): string {
  return [
    `**[#${i.ref}] ${i.subject}** (id: ${i.id})`,
    `  Estado: ${i.status_extra_info?.name} | Tipo: ${i.type_extra_info?.name} | Prioridad: ${i.priority_extra_info?.name}`,
    `  Severidad: ${i.severity_extra_info?.name} | Cerrada: ${i.is_closed ? "Sí" : "No"}`,
    `  Asignada: ${i.assigned_to_extra_info?.full_name ?? "Nadie"}`,
    i.tags.length ? `  Tags: ${i.tags.join(", ")}` : "",
    `  Versión: ${i.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatEpic(e: TaigaEpic): string {
  const counts = e.user_stories_counts;
  return [
    `**[#${e.ref}] ${e.subject}** (id: ${e.id}) — color: ${e.color}`,
    `  Estado: ${e.status_extra_info?.name ?? "Sin estado"} | Cerrada: ${e.is_closed ? "Sí" : "No"}`,
    `  User stories: ${counts.progress}/${counts.total}`,
    `  Asignada: ${e.assigned_to_extra_info?.full_name ?? "Nadie"}`,
    e.tags.length ? `  Tags: ${e.tags.join(", ")}` : "",
    `  Versión: ${e.version}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function formatWikiPage(w: TaigaWikiPage): string {
  const preview = w.content.length > 200 ? w.content.slice(0, 200) + "..." : w.content;
  return [
    `**[${w.id}] ${w.slug}**`,
    `  Proyecto: ${w.project_extra_info.name} | Modificada: ${w.modified_date}`,
    `  Contenido: ${preview}`,
    `  Versión: ${w.version}`,
  ].join("\n");
}
