import { describe, it, expect } from "vitest";
import {
  ProjectSchema,
  MilestoneSchema,
  UserStorySchema,
  TaskSchema,
  IssueSchema,
  EpicSchema,
  WikiPageSchema,
  UserRefSchema,
} from "../src/schemas.js";

const projectRef = { id: 1, name: "Proj", slug: "proj", description: "" };
const statusRef = { name: "Open", is_closed: false, color: "#000" };
const userRef = { id: 10, username: "jdoe", full_name: "John Doe", full_name_display: "John Doe", photo: null, big_photo: null, gravatar_id: "x", is_active: true };

// ─── ProjectSchema ────────────────────────────────────────────────────────────

describe("ProjectSchema", () => {
  const valid = {
    id: 1, name: "Test", slug: "test", description: "desc",
    is_private: false, total_milestones: 3,
    is_backlog_activated: true, is_issues_activated: true,
    is_wiki_activated: false, is_kanban_activated: false,
  };

  it("passes with valid data", () => {
    expect(ProjectSchema.safeParse(valid).success).toBe(true);
  });

  it("passes with extra fields (passthrough)", () => {
    expect(ProjectSchema.safeParse({ ...valid, extra_field: "ignored" }).success).toBe(true);
  });

  it("fails when id is missing", () => {
    const { id: _, ...rest } = valid;
    expect(ProjectSchema.safeParse(rest).success).toBe(false);
  });

  it("fails when name is not a string", () => {
    expect(ProjectSchema.safeParse({ ...valid, name: 123 }).success).toBe(false);
  });

  it("fails when is_private is not a boolean", () => {
    expect(ProjectSchema.safeParse({ ...valid, is_private: "yes" }).success).toBe(false);
  });
});

// ─── MilestoneSchema ──────────────────────────────────────────────────────────

describe("MilestoneSchema", () => {
  const valid = {
    id: 5, name: "Sprint 1", project: 1, project_extra_info: projectRef,
    estimated_start: "2024-01-01", estimated_finish: "2024-01-14",
    closed: false, total_points: 20, closed_points: 10,
  };

  it("passes with valid data", () => {
    expect(MilestoneSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when closed is not a boolean", () => {
    expect(MilestoneSchema.safeParse({ ...valid, closed: "no" }).success).toBe(false);
  });

  it("fails when total_points is not a number", () => {
    expect(MilestoneSchema.safeParse({ ...valid, total_points: "twenty" }).success).toBe(false);
  });
});

// ─── UserStorySchema ──────────────────────────────────────────────────────────

describe("UserStorySchema", () => {
  const valid = {
    id: 100, ref: 42, subject: "Login feature", project: 1,
    milestone: null, milestone_name: null, status: 1,
    status_extra_info: statusRef, assigned_to: null,
    assigned_to_extra_info: null, is_closed: false, tags: [], version: 1,
  };

  it("passes with valid data", () => {
    expect(UserStorySchema.safeParse(valid).success).toBe(true);
  });

  it("passes when milestone is null", () => {
    expect(UserStorySchema.safeParse({ ...valid, milestone: null }).success).toBe(true);
  });

  it("passes when assigned_to_extra_info is null", () => {
    expect(UserStorySchema.safeParse({ ...valid, assigned_to_extra_info: null }).success).toBe(true);
  });

  it("fails when tags is not an array", () => {
    expect(UserStorySchema.safeParse({ ...valid, tags: "auth" }).success).toBe(false);
  });

  it("fails when version is missing", () => {
    const { version: _, ...rest } = valid;
    expect(UserStorySchema.safeParse(rest).success).toBe(false);
  });
});

// ─── TaskSchema ───────────────────────────────────────────────────────────────

describe("TaskSchema", () => {
  const valid = {
    id: 200, ref: 7, subject: "Implement form", project: 1,
    user_story: null, status: 1, status_extra_info: statusRef,
    assigned_to: null, assigned_to_extra_info: null,
    is_closed: false, tags: [], version: 1,
  };

  it("passes with valid data", () => {
    expect(TaskSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when ref is not a number", () => {
    expect(TaskSchema.safeParse({ ...valid, ref: "seven" }).success).toBe(false);
  });
});

// ─── IssueSchema ─────────────────────────────────────────────────────────────

describe("IssueSchema", () => {
  const valid = {
    id: 300, ref: 15, subject: "Bug found", project: 1,
    status: 1, status_extra_info: statusRef,
    assigned_to: null, assigned_to_extra_info: null,
    is_closed: false, tags: [], version: 1,
  };

  it("passes with valid data", () => {
    expect(IssueSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when subject is missing", () => {
    const { subject: _, ...rest } = valid;
    expect(IssueSchema.safeParse(rest).success).toBe(false);
  });
});

// ─── EpicSchema ───────────────────────────────────────────────────────────────

describe("EpicSchema", () => {
  const valid = {
    id: 400, ref: 3, subject: "Auth epic", project: 1,
    status: 1, status_extra_info: statusRef,
    assigned_to: null, assigned_to_extra_info: null,
    is_closed: false, color: "#4CAF50", tags: [], version: 1,
    user_stories_counts: { total: 5, progress: 2 },
  };

  it("passes with valid data", () => {
    expect(EpicSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when user_stories_counts is missing", () => {
    const { user_stories_counts: _, ...rest } = valid;
    expect(EpicSchema.safeParse(rest).success).toBe(false);
  });

  it("fails when color is missing", () => {
    const { color: _, ...rest } = valid;
    expect(EpicSchema.safeParse(rest).success).toBe(false);
  });
});

// ─── WikiPageSchema ───────────────────────────────────────────────────────────

describe("WikiPageSchema", () => {
  const valid = {
    id: 500, slug: "getting-started", content: "# Hello",
    project: 1, project_extra_info: projectRef,
    modified_date: "2024-01-02", version: 1,
  };

  it("passes with valid data", () => {
    expect(WikiPageSchema.safeParse(valid).success).toBe(true);
  });

  it("fails when slug is missing", () => {
    const { slug: _, ...rest } = valid;
    expect(WikiPageSchema.safeParse(rest).success).toBe(false);
  });

  it("fails when content is not a string", () => {
    expect(WikiPageSchema.safeParse({ ...valid, content: 42 }).success).toBe(false);
  });
});

// ─── UserRefSchema ────────────────────────────────────────────────────────────

describe("UserRefSchema", () => {
  it("passes with valid data", () => {
    expect(UserRefSchema.safeParse(userRef).success).toBe(true);
  });

  it("fails when username is missing", () => {
    const { username: _, ...rest } = userRef;
    expect(UserRefSchema.safeParse(rest).success).toBe(false);
  });
});
