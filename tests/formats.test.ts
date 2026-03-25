import { describe, it, expect } from "vitest";
import {
  textResponse,
  errorResponse,
  formatProject,
  formatMilestone,
  formatUserStory,
  formatTask,
  formatIssue,
  formatEpic,
  formatWikiPage,
} from "../src/formats.js";
import { TaigaApiError } from "../src/errors.js";
import type {
  TaigaProject,
  TaigaMilestone,
  TaigaUserStory,
  TaigaTask,
  TaigaIssue,
  TaigaEpic,
  TaigaWikiPage,
} from "../src/types.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const projectRef = { id: 1, name: "My Project", slug: "my-project", description: "" };
const userRef = {
  id: 10,
  username: "jdoe",
  full_name: "John Doe",
  full_name_display: "John Doe",
  photo: null,
  big_photo: null,
  gravatar_id: "abc",
  is_active: true,
};
const statusRef = { name: "In Progress", color: "#ff0", is_closed: false };

const baseProject: TaigaProject = {
  id: 1,
  name: "My Project",
  slug: "my-project",
  description: "A test project",
  is_private: false,
  created_date: "2024-01-01",
  modified_date: "2024-01-02",
  owner: userRef,
  members: [],
  total_milestones: 2,
  total_story_points: null,
  is_backlog_activated: true,
  is_issues_activated: true,
  is_wiki_activated: false,
  is_kanban_activated: false,
};

const baseMilestone: TaigaMilestone = {
  id: 5,
  name: "Sprint 1",
  slug: "sprint-1",
  project: 1,
  project_extra_info: projectRef,
  owner: null,
  estimated_start: "2024-01-01",
  estimated_finish: "2024-01-14",
  created_date: "2024-01-01",
  modified_date: "2024-01-01",
  closed: false,
  disponibility: 0,
  total_points: 20,
  closed_points: 10,
  user_stories: [],
};

const baseUserStory: TaigaUserStory = {
  id: 100,
  ref: 42,
  subject: "As a user I want to log in",
  description: null,
  project: 1,
  project_extra_info: projectRef,
  milestone: null,
  milestone_name: null,
  milestone_slug: null,
  status: 1,
  status_extra_info: statusRef,
  assigned_to: null,
  assigned_to_extra_info: null,
  is_closed: false,
  is_blocked: false,
  blocked_note: "",
  points: {},
  total_points: null,
  created_date: "2024-01-01",
  modified_date: "2024-01-01",
  tags: [],
  version: 1,
};

const baseTask: TaigaTask = {
  id: 200,
  ref: 7,
  subject: "Implement login form",
  description: null,
  project: 1,
  project_extra_info: projectRef,
  user_story: 100,
  user_story_extra_info: { id: 100, ref: 42, subject: "As a user I want to log in" },
  milestone: null,
  milestone_slug: null,
  status: 1,
  status_extra_info: statusRef,
  assigned_to: null,
  assigned_to_extra_info: null,
  is_closed: false,
  is_blocked: false,
  blocked_note: "",
  created_date: "2024-01-01",
  modified_date: "2024-01-01",
  tags: [],
  version: 1,
};

const baseIssue: TaigaIssue = {
  id: 300,
  ref: 15,
  subject: "Login button broken",
  description: null,
  project: 1,
  project_extra_info: projectRef,
  milestone: null,
  milestone_slug: null,
  status: 1,
  status_extra_info: statusRef,
  type: 1,
  type_extra_info: { name: "Bug", color: "#f00" },
  priority: 1,
  priority_extra_info: { name: "High", color: "#f00" },
  severity: 1,
  severity_extra_info: { name: "Major", color: "#f00" },
  assigned_to: null,
  assigned_to_extra_info: null,
  is_closed: false,
  is_blocked: false,
  blocked_note: "",
  created_date: "2024-01-01",
  modified_date: "2024-01-01",
  tags: [],
  version: 1,
};

const baseEpic: TaigaEpic = {
  id: 400,
  ref: 3,
  subject: "Authentication epic",
  description: null,
  project: 1,
  project_extra_info: projectRef,
  status: 1,
  status_extra_info: statusRef,
  assigned_to: null,
  assigned_to_extra_info: null,
  is_closed: false,
  color: "#4CAF50",
  created_date: "2024-01-01",
  modified_date: "2024-01-01",
  tags: [],
  version: 1,
  user_stories_counts: { total: 5, progress: 2 },
};

const baseWikiPage: TaigaWikiPage = {
  id: 500,
  slug: "getting-started",
  content: "# Getting Started\n\nWelcome to the project.",
  project: 1,
  project_extra_info: projectRef,
  owner: null,
  last_modifier: null,
  created_date: "2024-01-01",
  modified_date: "2024-01-02",
  version: 1,
};

// ─── textResponse ─────────────────────────────────────────────────────────────

describe("textResponse", () => {
  it("returns correct MCP content structure", () => {
    const res = textResponse("hello");
    expect(res.content).toHaveLength(1);
    expect(res.content[0].type).toBe("text");
    expect(res.content[0].text).toBe("hello");
  });
});

// ─── errorResponse ────────────────────────────────────────────────────────────

describe("errorResponse", () => {
  it("formats a generic Error", () => {
    const res = errorResponse(new Error("something went wrong"));
    expect(res.content[0].text).toContain("something went wrong");
  });

  it("formats a TaigaApiError with status", () => {
    const res = errorResponse(new TaigaApiError(404, "not found"));
    expect(res.content[0].text).toContain("404");
    expect(res.content[0].text).toContain("Not found");
  });

  it("formats a non-Error value", () => {
    const res = errorResponse("plain string error");
    expect(res.content[0].text).toContain("plain string error");
  });
});

// ─── formatProject ────────────────────────────────────────────────────────────

describe("formatProject", () => {
  it("includes id, name and slug", () => {
    const result = formatProject(baseProject);
    expect(result).toContain("[1]");
    expect(result).toContain("My Project");
    expect(result).toContain("my-project");
  });

  it("includes active modules", () => {
    const result = formatProject(baseProject);
    expect(result).toContain("Backlog");
    expect(result).toContain("Issues");
  });

  it("does not crash with empty description", () => {
    const result = formatProject({ ...baseProject, description: "" });
    expect(result).toBeTruthy();
  });
});

// ─── formatMilestone ──────────────────────────────────────────────────────────

describe("formatMilestone", () => {
  it("includes id, name and dates", () => {
    const result = formatMilestone(baseMilestone);
    expect(result).toContain("[5]");
    expect(result).toContain("Sprint 1");
    expect(result).toContain("2024-01-01");
    expect(result).toContain("2024-01-14");
  });

  it("shows progress percentage", () => {
    const result = formatMilestone(baseMilestone);
    expect(result).toContain("50%");
  });

  it("handles zero total points", () => {
    const result = formatMilestone({ ...baseMilestone, total_points: 0, closed_points: 0 });
    expect(result).toBeTruthy();
  });
});

// ─── formatUserStory ──────────────────────────────────────────────────────────

describe("formatUserStory", () => {
  it("includes ref, subject and id", () => {
    const result = formatUserStory(baseUserStory);
    expect(result).toContain("#42");
    expect(result).toContain("As a user I want to log in");
    expect(result).toContain("id: 100");
  });

  it("shows Backlog when no milestone", () => {
    const result = formatUserStory(baseUserStory);
    expect(result).toContain("Backlog");
  });

  it("shows tags when present", () => {
    const result = formatUserStory({ ...baseUserStory, tags: ["auth", "ui"] });
    expect(result).toContain("auth");
    expect(result).toContain("ui");
  });

  it("does not crash with empty tags", () => {
    const result = formatUserStory({ ...baseUserStory, tags: [] });
    expect(result).toBeTruthy();
  });
});

// ─── formatTask ───────────────────────────────────────────────────────────────

describe("formatTask", () => {
  it("includes ref, subject and id", () => {
    const result = formatTask(baseTask);
    expect(result).toContain("#7");
    expect(result).toContain("Implement login form");
    expect(result).toContain("id: 200");
  });

  it("shows linked user story", () => {
    const result = formatTask(baseTask);
    expect(result).toContain("#42");
  });

  it("shows Sin US when no user story", () => {
    const result = formatTask({ ...baseTask, user_story: null, user_story_extra_info: null });
    expect(result).toContain("Sin US");
  });
});

// ─── formatIssue ──────────────────────────────────────────────────────────────

describe("formatIssue", () => {
  it("includes ref, subject and id", () => {
    const result = formatIssue(baseIssue);
    expect(result).toContain("#15");
    expect(result).toContain("Login button broken");
    expect(result).toContain("id: 300");
  });

  it("includes type, priority and severity", () => {
    const result = formatIssue(baseIssue);
    expect(result).toContain("Bug");
    expect(result).toContain("High");
    expect(result).toContain("Major");
  });
});

// ─── formatEpic ───────────────────────────────────────────────────────────────

describe("formatEpic", () => {
  it("includes ref, subject and id", () => {
    const result = formatEpic(baseEpic);
    expect(result).toContain("#3");
    expect(result).toContain("Authentication epic");
    expect(result).toContain("id: 400");
  });

  it("shows user story progress", () => {
    const result = formatEpic(baseEpic);
    expect(result).toContain("2/5");
  });

  it("includes color", () => {
    const result = formatEpic(baseEpic);
    expect(result).toContain("#4CAF50");
  });
});

// ─── formatWikiPage ───────────────────────────────────────────────────────────

describe("formatWikiPage", () => {
  it("includes id and slug", () => {
    const result = formatWikiPage(baseWikiPage);
    expect(result).toContain("[500]");
    expect(result).toContain("getting-started");
  });

  it("truncates long content", () => {
    const longContent = "x".repeat(300);
    const result = formatWikiPage({ ...baseWikiPage, content: longContent });
    expect(result).toContain("...");
  });

  it("does not truncate short content", () => {
    const result = formatWikiPage(baseWikiPage);
    expect(result).not.toContain("...");
  });
});
