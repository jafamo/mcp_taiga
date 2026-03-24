// ─── Auth ───────────────────────────────────────────────────────────────────

export interface TaigaAuthResponse {
  auth_token: string;
  refresh: string;
  id: number;
  username: string;
  full_name: string;
  email: string;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export interface TaigaProject {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_private: boolean;
  created_date: string;
  modified_date: string;
  owner: TaigaUserRef;
  members: TaigaUserRef[];
  total_milestones: number;
  total_story_points: number | null;
  is_backlog_activated: boolean;
  is_issues_activated: boolean;
  is_wiki_activated: boolean;
  is_kanban_activated: boolean;
}

// ─── Milestones (Sprints) ─────────────────────────────────────────────────────

export interface TaigaMilestone {
  id: number;
  name: string;
  slug: string;
  project: number;
  project_extra_info: TaigaProjectRef;
  owner: TaigaUserRef | null;
  estimated_start: string;
  estimated_finish: string;
  created_date: string;
  modified_date: string;
  closed: boolean;
  disponibility: number;
  total_points: number;
  closed_points: number;
  user_stories: TaigaUserStory[];
}

// ─── User Stories ─────────────────────────────────────────────────────────────

export interface TaigaUserStory {
  id: number;
  ref: number;
  subject: string;
  description: string | null;
  project: number;
  project_extra_info: TaigaProjectRef;
  milestone: number | null;
  milestone_name: string | null;
  milestone_slug: string | null;
  status: number | null;
  status_extra_info: TaigaStatusRef | null;
  assigned_to: number | null;
  assigned_to_extra_info: TaigaUserRef | null;
  is_closed: boolean;
  is_blocked: boolean;
  blocked_note: string;
  points: Record<string, unknown>;
  total_points: number | null;
  created_date: string;
  modified_date: string;
  tags: string[];
  version: number;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

export interface TaigaTask {
  id: number;
  ref: number;
  subject: string;
  description: string | null;
  project: number;
  project_extra_info: TaigaProjectRef;
  user_story: number | null;
  user_story_extra_info: TaigaUserStoryRef | null;
  milestone: number | null;
  milestone_slug: string | null;
  status: number;
  status_extra_info: TaigaStatusRef;
  assigned_to: number | null;
  assigned_to_extra_info: TaigaUserRef | null;
  is_closed: boolean;
  is_blocked: boolean;
  blocked_note: string;
  created_date: string;
  modified_date: string;
  tags: string[];
  version: number;
}

// ─── Issues ──────────────────────────────────────────────────────────────────

export interface TaigaIssue {
  id: number;
  ref: number;
  subject: string;
  description: string | null;
  project: number;
  project_extra_info: TaigaProjectRef;
  milestone: number | null;
  milestone_slug: string | null;
  status: number;
  status_extra_info: TaigaStatusRef;
  type: number;
  type_extra_info: TaigaTypeRef;
  priority: number;
  priority_extra_info: TaigaPriorityRef;
  severity: number;
  severity_extra_info: TaigaSeverityRef;
  assigned_to: number | null;
  assigned_to_extra_info: TaigaUserRef | null;
  is_closed: boolean;
  is_blocked: boolean;
  blocked_note: string;
  created_date: string;
  modified_date: string;
  tags: string[];
  version: number;
}

// ─── Epics ───────────────────────────────────────────────────────────────────

export interface TaigaEpic {
  id: number;
  ref: number;
  subject: string;
  description: string | null;
  project: number;
  project_extra_info: TaigaProjectRef;
  status: number;
  status_extra_info: TaigaStatusRef;
  assigned_to: number | null;
  assigned_to_extra_info: TaigaUserRef | null;
  is_closed: boolean;
  color: string;
  created_date: string;
  modified_date: string;
  tags: string[];
  version: number;
  user_stories_counts: {
    total: number;
    progress: number;
  };
}

// ─── Wiki ─────────────────────────────────────────────────────────────────────

export interface TaigaWikiPage {
  id: number;
  slug: string;
  content: string;
  project: number;
  project_extra_info: TaigaProjectRef;
  owner: TaigaUserRef | null;
  last_modifier: number | null;
  created_date: string;
  modified_date: string;
  version: number;
}

// ─── Shared Reference Types ──────────────────────────────────────────────────

export interface TaigaUserRef {
  id: number;
  username: string;
  full_name: string;
  full_name_display: string;
  photo: string | null;
  big_photo: string | null;
  gravatar_id: string;
  is_active: boolean;
}

export interface TaigaProjectRef {
  id: number;
  name: string;
  slug: string;
  description: string;
}

export interface TaigaStatusRef {
  name: string;
  color: string;
  is_closed: boolean;
}

export interface TaigaUserStoryRef {
  id: number;
  ref: number;
  subject: string;
}

export interface TaigaTypeRef {
  name: string;
  color: string;
}

export interface TaigaPriorityRef {
  name: string;
  color: string;
}

export interface TaigaSeverityRef {
  name: string;
  color: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export interface TaigaSearchResult {
  epics: TaigaEpic[];
  userstories: TaigaUserStory[];
  issues: TaigaIssue[];
  tasks: TaigaTask[];
  wikipages: TaigaWikiPage[];
  count: number;
}

// ─── API Pagination ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

// ─── Tool Response ───────────────────────────────────────────────────────────

export interface ToolTextResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
}
