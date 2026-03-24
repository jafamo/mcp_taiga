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

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Taiga API error ${response.status}`;
    try {
      const errorBody = await response.json() as Record<string, unknown>;
      const detail = errorBody["_error_message"] ?? errorBody["detail"] ?? JSON.stringify(errorBody);
      errorMessage += `: ${detail}`;
    } catch {
      errorMessage += `: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

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
  return api.get<TaigaProject[]>("projects", member ? { member } : undefined);
}

export async function getProject(projectId: number): Promise<TaigaProject> {
  return api.get<TaigaProject>(`projects/${projectId}`);
}

export async function getProjectBySlug(slug: string): Promise<TaigaProject> {
  return api.get<TaigaProject>(`projects/by_slug`, { slug });
}

export async function createProject(data: {
  name: string;
  description?: string;
  is_private?: boolean;
}): Promise<TaigaProject> {
  return api.post<TaigaProject>("projects", data);
}

// ─── Milestones (Sprints) ─────────────────────────────────────────────────────

export async function listMilestones(projectId: number, closed?: boolean): Promise<TaigaMilestone[]> {
  return api.get<TaigaMilestone[]>("milestones", { project: projectId, ...(closed !== undefined ? { closed } : {}) });
}

export async function getMilestone(milestoneId: number): Promise<TaigaMilestone> {
  return api.get<TaigaMilestone>(`milestones/${milestoneId}`);
}

export async function createMilestone(data: {
  project: number;
  name: string;
  estimated_start: string;
  estimated_finish: string;
}): Promise<TaigaMilestone> {
  return api.post<TaigaMilestone>("milestones", data);
}

// ─── User Stories ─────────────────────────────────────────────────────────────

export async function listUserStories(params: {
  project?: number;
  milestone?: number;
  assigned_to?: number;
  status?: number;
  tags?: string;
}): Promise<TaigaUserStory[]> {
  return api.get<TaigaUserStory[]>("userstories", params as Record<string, string | number | boolean | undefined>);
}

export async function getUserStory(userStoryId: number): Promise<TaigaUserStory> {
  return api.get<TaigaUserStory>(`userstories/${userStoryId}`);
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
  return api.post<TaigaUserStory>("userstories", data);
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
  return api.patch<TaigaUserStory>(`userstories/${userStoryId}`, { version, ...data });
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
  return api.get<TaigaTask[]>("tasks", params as Record<string, string | number | boolean | undefined>);
}

export async function getTask(taskId: number): Promise<TaigaTask> {
  return api.get<TaigaTask>(`tasks/${taskId}`);
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
  return api.post<TaigaTask>("tasks", data);
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
  return api.patch<TaigaTask>(`tasks/${taskId}`, { version, ...data });
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
  return api.get<TaigaIssue[]>("issues", params as Record<string, string | number | boolean | undefined>);
}

export async function getIssue(issueId: number): Promise<TaigaIssue> {
  return api.get<TaigaIssue>(`issues/${issueId}`);
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
  return api.post<TaigaIssue>("issues", data);
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
  return api.patch<TaigaIssue>(`issues/${issueId}`, { version, ...data });
}

export async function deleteIssue(issueId: number): Promise<void> {
  await api.delete(`issues/${issueId}`);
}

// ─── Epics ────────────────────────────────────────────────────────────────────

export async function listEpics(projectId: number): Promise<TaigaEpic[]> {
  return api.get<TaigaEpic[]>("epics", { project: projectId });
}

export async function getEpic(epicId: number): Promise<TaigaEpic> {
  return api.get<TaigaEpic>(`epics/${epicId}`);
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
  return api.post<TaigaEpic>("epics", data);
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
  return api.patch<TaigaEpic>(`epics/${epicId}`, { version, ...data });
}

// ─── Wiki ─────────────────────────────────────────────────────────────────────

export async function listWikiPages(projectId: number): Promise<TaigaWikiPage[]> {
  return api.get<TaigaWikiPage[]>("wiki", { project: projectId });
}

export async function getWikiPage(pageId: number): Promise<TaigaWikiPage> {
  return api.get<TaigaWikiPage>(`wiki/${pageId}`);
}

export async function getWikiPageBySlug(projectId: number, slug: string): Promise<TaigaWikiPage> {
  return api.get<TaigaWikiPage>(`wiki/by_slug`, { project: projectId, slug });
}

export async function createWikiPage(data: {
  project: number;
  slug: string;
  content: string;
}): Promise<TaigaWikiPage> {
  return api.post<TaigaWikiPage>("wiki", data);
}

export async function editWikiPage(
  pageId: number,
  version: number,
  content: string
): Promise<TaigaWikiPage> {
  return api.patch<TaigaWikiPage>(`wiki/${pageId}`, { version, content });
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchProject(projectId: number, text: string): Promise<TaigaSearchResult> {
  return api.get<TaigaSearchResult>(`search`, { project: projectId, text });
}

// ─── Members ──────────────────────────────────────────────────────────────────

export async function listMembers(projectId: number): Promise<TaigaUserRef[]> {
  const memberships = await api.get<Array<{ user: number; user_data: TaigaUserRef }>>(
    "memberships",
    { project: projectId }
  );
  return memberships.map((m) => m.user_data);
}
