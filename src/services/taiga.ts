import type {
  TaigaAuthResponse,
  TaigaProject,
  TaigaMilestone,
  TaigaUserStory,
  TaigaTask,
  TaigaIssue,
  TaigaEpic,
  TaigaWikiPage,
  TaigaSearchResult,
  TaigaUserRef,
} from "../types.js";
import { z } from "zod";
import { logger } from "../logger.js";
import { TaigaApiError } from "../errors.js";
import {
  ProjectSchema,
  MilestoneSchema,
  UserStorySchema,
  TaskSchema,
  IssueSchema,
  EpicSchema,
  WikiPageSchema,
  UserRefSchema,
} from "../schemas.js";

export type { TaigaUserRef };

// ─── Config ──────────────────────────────────────────────────────────────────

let TAIGA_URL = "";
let AUTH_TOKEN = "";

export function configure(url: string, token: string): void {
  TAIGA_URL = url.replace(/\/$/, "");
  AUTH_TOKEN = token;
}

// ─── HTTP Client ─────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${TAIGA_URL}/api/v1/${path}`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  const start = Date.now();

  logger.debug("HTTP request", { method, url: url.toString() });

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const ms = Date.now() - start;

  if (!response.ok) {
    let details = response.statusText;
    try {
      const errorBody = await response.json() as Record<string, unknown>;
      details = String(errorBody["_error_message"] ?? errorBody["detail"] ?? JSON.stringify(errorBody));
    } catch {
      // keep statusText as details
    }
    logger.warn("HTTP error", { method, path, status: response.status, ms, details });
    throw new TaigaApiError(response.status, details);
  }

  logger.debug("HTTP response", { method, path, status: response.status, ms });

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>("GET", path, undefined, params),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<Record<string, never>>("DELETE", path),
};

// ─── Response Validation ─────────────────────────────────────────────────────
// Non-breaking: logs a warning on schema mismatch but returns the data as-is
// so existing functionality is never disrupted by an unexpected API shape.

function validate(schema: z.ZodTypeAny, data: unknown, context: string): unknown {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn("API response validation failed", {
      context,
      issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return data;
}

function validateArray(schema: z.ZodTypeAny, data: unknown, context: string): unknown[] {
  const result = z.array(schema).safeParse(data);
  if (!result.success) {
    logger.warn("API response validation failed", {
      context,
      issues: result.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`),
    });
  }
  return data as unknown[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function authenticate(username: string, password: string): Promise<TaigaAuthResponse> {
  const url = `${TAIGA_URL}/api/v1/auth`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "normal", username, password }),
  });
  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.statusText}`);
  }
  return response.json() as Promise<TaigaAuthResponse>;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(member?: number): Promise<TaigaProject[]> {
  const data = await api.get<unknown>("projects", member ? { member } : undefined);
  return validateArray(ProjectSchema, data, "listProjects") as unknown as TaigaProject[];
}

export async function getProject(projectId: number): Promise<TaigaProject> {
  const data = await api.get<unknown>(`projects/${projectId}`);
  return validate(ProjectSchema, data, "getProject") as unknown as TaigaProject;
}

export async function getProjectBySlug(slug: string): Promise<TaigaProject> {
  const data = await api.get<unknown>(`projects/by_slug`, { slug });
  return validate(ProjectSchema, data, "getProjectBySlug") as unknown as TaigaProject;
}

export async function createProject(data: {
  name: string;
  description?: string;
  is_private?: boolean;
}): Promise<TaigaProject> {
  const res = await api.post<unknown>("projects", data);
  return validate(ProjectSchema, res, "createProject") as unknown as TaigaProject;
}

// ─── Milestones (Sprints) ─────────────────────────────────────────────────────

export async function listMilestones(projectId: number, closed?: boolean): Promise<TaigaMilestone[]> {
  const data = await api.get<unknown>("milestones", { project: projectId, ...(closed !== undefined ? { closed } : {}) });
  return validateArray(MilestoneSchema, data, "listMilestones") as unknown as TaigaMilestone[];
}

export async function getMilestone(milestoneId: number): Promise<TaigaMilestone> {
  const data = await api.get<unknown>(`milestones/${milestoneId}`);
  return validate(MilestoneSchema, data, "getMilestone") as unknown as TaigaMilestone;
}

export async function createMilestone(data: {
  project: number;
  name: string;
  estimated_start: string;
  estimated_finish: string;
}): Promise<TaigaMilestone> {
  const res = await api.post<unknown>("milestones", data);
  return validate(MilestoneSchema, res, "createMilestone") as unknown as TaigaMilestone;
}

// ─── User Stories ─────────────────────────────────────────────────────────────

export async function listUserStories(params: {
  project?: number;
  milestone?: number;
  assigned_to?: number;
  status?: number;
  tags?: string;
}): Promise<TaigaUserStory[]> {
  const data = await api.get<unknown>("userstories", params as Record<string, string | number | boolean | undefined>);
  return validateArray(UserStorySchema, data, "listUserStories") as unknown as TaigaUserStory[];
}

export async function getUserStory(userStoryId: number): Promise<TaigaUserStory> {
  const data = await api.get<unknown>(`userstories/${userStoryId}`);
  return validate(UserStorySchema, data, "getUserStory") as unknown as TaigaUserStory;
}

export async function createUserStory(data: {
  project: number;
  subject: string;
  description?: string;
  milestone?: number;
  assigned_to?: number;
  tags?: string[];
  status?: number;
}): Promise<TaigaUserStory> {
  const res = await api.post<unknown>("userstories", data);
  return validate(UserStorySchema, res, "createUserStory") as unknown as TaigaUserStory;
}

export async function editUserStory(
  userStoryId: number,
  version: number,
  data: Partial<{
    subject: string;
    description: string;
    milestone: number | null;
    assigned_to: number | null;
    status: number;
    tags: string[];
  }>
): Promise<TaigaUserStory> {
  const res = await api.patch<unknown>(`userstories/${userStoryId}`, { version, ...data });
  return validate(UserStorySchema, res, "editUserStory") as unknown as TaigaUserStory;
}

export async function deleteUserStory(userStoryId: number): Promise<void> {
  await api.delete(`userstories/${userStoryId}`);
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function listTasks(params: {
  project?: number;
  milestone?: number;
  user_story?: number;
  assigned_to?: number;
  status?: number;
}): Promise<TaigaTask[]> {
  const data = await api.get<unknown>("tasks", params as Record<string, string | number | boolean | undefined>);
  return validateArray(TaskSchema, data, "listTasks") as unknown as TaigaTask[];
}

export async function getTask(taskId: number): Promise<TaigaTask> {
  const data = await api.get<unknown>(`tasks/${taskId}`);
  return validate(TaskSchema, data, "getTask") as unknown as TaigaTask;
}

export async function createTask(data: {
  project: number;
  subject: string;
  description?: string;
  user_story?: number;
  milestone?: number;
  assigned_to?: number;
  tags?: string[];
  status?: number;
}): Promise<TaigaTask> {
  const res = await api.post<unknown>("tasks", data);
  return validate(TaskSchema, res, "createTask") as unknown as TaigaTask;
}

export async function editTask(
  taskId: number,
  version: number,
  data: Partial<{
    subject: string;
    description: string;
    user_story: number | null;
    milestone: number | null;
    assigned_to: number | null;
    status: number;
    tags: string[];
  }>
): Promise<TaigaTask> {
  const res = await api.patch<unknown>(`tasks/${taskId}`, { version, ...data });
  return validate(TaskSchema, res, "editTask") as unknown as TaigaTask;
}

export async function deleteTask(taskId: number): Promise<void> {
  await api.delete(`tasks/${taskId}`);
}

// ─── Issues ───────────────────────────────────────────────────────────────────

export async function listIssues(params: {
  project?: number;
  milestone?: number;
  assigned_to?: number;
  status?: number;
  type?: number;
  priority?: number;
  severity?: number;
}): Promise<TaigaIssue[]> {
  const data = await api.get<unknown>("issues", params as Record<string, string | number | boolean | undefined>);
  return validateArray(IssueSchema, data, "listIssues") as unknown as TaigaIssue[];
}

export async function getIssue(issueId: number): Promise<TaigaIssue> {
  const data = await api.get<unknown>(`issues/${issueId}`);
  return validate(IssueSchema, data, "getIssue") as unknown as TaigaIssue;
}

export async function createIssue(data: {
  project: number;
  subject: string;
  description?: string;
  milestone?: number;
  assigned_to?: number;
  tags?: string[];
  status?: number;
  type?: number;
  priority?: number;
  severity?: number;
}): Promise<TaigaIssue> {
  const res = await api.post<unknown>("issues", data);
  return validate(IssueSchema, res, "createIssue") as unknown as TaigaIssue;
}

export async function editIssue(
  issueId: number,
  version: number,
  data: Partial<{
    subject: string;
    description: string;
    milestone: number | null;
    assigned_to: number | null;
    status: number;
    type: number;
    priority: number;
    severity: number;
    tags: string[];
  }>
): Promise<TaigaIssue> {
  const res = await api.patch<unknown>(`issues/${issueId}`, { version, ...data });
  return validate(IssueSchema, res, "editIssue") as unknown as TaigaIssue;
}

export async function deleteIssue(issueId: number): Promise<void> {
  await api.delete(`issues/${issueId}`);
}

// ─── Epics ────────────────────────────────────────────────────────────────────

export async function listEpics(projectId: number): Promise<TaigaEpic[]> {
  const data = await api.get<unknown>("epics", { project: projectId });
  return validateArray(EpicSchema, data, "listEpics") as unknown as TaigaEpic[];
}

export async function getEpic(epicId: number): Promise<TaigaEpic> {
  const data = await api.get<unknown>(`epics/${epicId}`);
  return validate(EpicSchema, data, "getEpic") as unknown as TaigaEpic;
}

export async function createEpic(data: {
  project: number;
  subject: string;
  description?: string;
  assigned_to?: number;
  tags?: string[];
  color?: string;
  status?: number;
}): Promise<TaigaEpic> {
  const res = await api.post<unknown>("epics", data);
  return validate(EpicSchema, res, "createEpic") as unknown as TaigaEpic;
}

export async function editEpic(
  epicId: number,
  version: number,
  data: Partial<{
    subject: string;
    description: string;
    assigned_to: number | null;
    status: number;
    tags: string[];
    color: string;
  }>
): Promise<TaigaEpic> {
  const res = await api.patch<unknown>(`epics/${epicId}`, { version, ...data });
  return validate(EpicSchema, res, "editEpic") as unknown as TaigaEpic;
}

// ─── Wiki ─────────────────────────────────────────────────────────────────────

export async function listWikiPages(projectId: number): Promise<TaigaWikiPage[]> {
  const data = await api.get<unknown>("wiki", { project: projectId });
  return validateArray(WikiPageSchema, data, "listWikiPages") as unknown as TaigaWikiPage[];
}

export async function getWikiPage(pageId: number): Promise<TaigaWikiPage> {
  const data = await api.get<unknown>(`wiki/${pageId}`);
  return validate(WikiPageSchema, data, "getWikiPage") as unknown as TaigaWikiPage;
}

export async function getWikiPageBySlug(projectId: number, slug: string): Promise<TaigaWikiPage> {
  const data = await api.get<unknown>(`wiki/by_slug`, { project: projectId, slug });
  return validate(WikiPageSchema, data, "getWikiPageBySlug") as unknown as TaigaWikiPage;
}

export async function createWikiPage(data: {
  project: number;
  slug: string;
  content: string;
}): Promise<TaigaWikiPage> {
  const res = await api.post<unknown>("wiki", data);
  return validate(WikiPageSchema, res, "createWikiPage") as unknown as TaigaWikiPage;
}

export async function editWikiPage(
  pageId: number,
  version: number,
  content: string
): Promise<TaigaWikiPage> {
  const res = await api.patch<unknown>(`wiki/${pageId}`, { version, content });
  return validate(WikiPageSchema, res, "editWikiPage") as unknown as TaigaWikiPage;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchProject(projectId: number, text: string): Promise<TaigaSearchResult> {
  return api.get<TaigaSearchResult>(`search`, { project: projectId, text });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(projectId: number): Promise<TaigaUserRef[]> {
  const memberships = await api.get<Array<{ user: number; user_data: unknown }>>(
    "memberships",
    { project: projectId }
  );
  return memberships.map((m) => validate(UserRefSchema, m.user_data, "listMembers") as TaigaUserRef);
}
