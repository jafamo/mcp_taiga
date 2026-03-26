import { z } from "zod";

// ─── Shared ───────────────────────────────────────────────────────────────────

const UserRef = z.object({
  id: z.number(),
  username: z.string(),
  full_name: z.string(),
}).passthrough();

const ProjectRef = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
}).passthrough();

const StatusRef = z.object({
  name: z.string(),
  is_closed: z.boolean(),
}).passthrough();

// ─── Entities ─────────────────────────────────────────────────────────────────

export const ProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  is_private: z.boolean(),
  total_milestones: z.number(),
  is_backlog_activated: z.boolean(),
  is_issues_activated: z.boolean(),
  is_wiki_activated: z.boolean(),
  is_kanban_activated: z.boolean(),
}).passthrough();

export const MilestoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  project: z.number(),
  project_extra_info: ProjectRef,
  estimated_start: z.string(),
  estimated_finish: z.string(),
  closed: z.boolean(),
  total_points: z.number(),
  closed_points: z.number(),
}).passthrough();

export const UserStorySchema = z.object({
  id: z.number(),
  ref: z.number(),
  subject: z.string(),
  project: z.number(),
  milestone: z.number().nullable(),
  milestone_name: z.string().nullable(),
  status: z.number().nullable(),
  status_extra_info: StatusRef.nullable(),
  assigned_to: z.number().nullable(),
  assigned_to_extra_info: UserRef.nullable(),
  is_closed: z.boolean(),
  tags: z.array(z.string()),
  version: z.number(),
}).passthrough();

export const TaskSchema = z.object({
  id: z.number(),
  ref: z.number(),
  subject: z.string(),
  project: z.number(),
  user_story: z.number().nullable(),
  status: z.number(),
  status_extra_info: StatusRef,
  assigned_to: z.number().nullable(),
  assigned_to_extra_info: UserRef.nullable(),
  is_closed: z.boolean(),
  tags: z.array(z.string()),
  version: z.number(),
}).passthrough();

export const IssueSchema = z.object({
  id: z.number(),
  ref: z.number(),
  subject: z.string(),
  project: z.number(),
  status: z.number(),
  status_extra_info: StatusRef,
  assigned_to: z.number().nullable(),
  assigned_to_extra_info: UserRef.nullable(),
  is_closed: z.boolean(),
  tags: z.array(z.string()),
  version: z.number(),
}).passthrough();

export const EpicSchema = z.object({
  id: z.number(),
  ref: z.number(),
  subject: z.string(),
  project: z.number(),
  status: z.number(),
  status_extra_info: StatusRef,
  assigned_to: z.number().nullable(),
  assigned_to_extra_info: UserRef.nullable(),
  is_closed: z.boolean(),
  color: z.string(),
  tags: z.array(z.string()),
  version: z.number(),
  user_stories_counts: z.object({ total: z.number(), progress: z.number() }),
}).passthrough();

export const WikiPageSchema = z.object({
  id: z.number(),
  slug: z.string(),
  content: z.string(),
  project: z.number(),
  project_extra_info: ProjectRef,
  modified_date: z.string(),
  version: z.number(),
}).passthrough();

export const UserRefSchema = UserRef;
