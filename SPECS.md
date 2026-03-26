# Taiga MCP Server — Specifications

> Source of truth for the implementation. Read before writing or modifying code.

---

## File structure

```
taiga/
├── src/
│   ├── index.ts                  # Entry point, orchestration
│   ├── types.ts                  # TypeScript interfaces for Taiga entities
│   ├── formats.ts                # Response formatters
│   ├── logger.ts                 # Structured logger (DEBUG/INFO/WARN/ERROR)
│   ├── errors.ts                 # TaigaApiError class
│   ├── services/
│   │   └── taiga.ts              # HTTP client + API functions
│   └── tools/
│       ├── projects.ts           # registerProjectTools()
│       ├── milestones.ts         # registerMilestoneTools()
│       ├── userstories.ts        # registerUserStoryTools()
│       ├── tasks.ts              # registerTaskTools()
│       ├── issues.ts             # registerIssueTools()
│       ├── epics.ts              # registerEpicTools()
│       └── wiki-search.ts        # registerWikiAndSearchTools()
├── dist/                         # Compiled output (generated, not in git)
├── package.json
├── tsconfig.json
├── SPECS.md
├── DECISIONS.md
└── README.md
```

---

## General conventions

### registerXxxTools signature

```typescript
export function registerXxxTools(server: McpServer): void
```

Each module receives the `McpServer` instance and registers its tools via `server.tool()`.

### Responses

- Always use `textResponse(text)` for success and `errorResponse(error)` for errors.
- List operations must show a summary with count: `"N projects found:\n..."`.
- Create/edit operations must confirm with the formatted object.
- Delete operations must confirm with a simple message: `"Deleted successfully (id: N)"`.

### Error handling

Every tool handler must be wrapped in `try/catch` and return `errorResponse(error)`.
Errors thrown by the HTTP client are `TaigaApiError` instances with a `status` field.

```typescript
server.tool("tool_name", schema, async (params) => {
  logger.debug("tool invoked", { tool: "tool_name", ...relevantParams });
  try {
    // logic
    return textResponse(result);
  } catch (error) {
    logger.error("tool failed", { tool: "tool_name", error: String(error) });
    return errorResponse(error);
  }
});
```

### Logging

All tools log at `DEBUG` level on invocation and `ERROR` level on failure via `src/logger.ts`.
The HTTP client logs each request/response at `DEBUG` and errors at `WARN`.
Log level is configured via the `LOG_LEVEL` environment variable (default: `info`).

All log output goes to **stderr** — stdout is reserved for the MCP stdio protocol.

### Zod schemas

- Required params: `z.string()`, `z.number().int().positive()`
- Optional params: `.optional()`
- Numeric IDs: `z.number().int().positive()`
- Dates: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD")`
- Tag arrays: `z.array(z.string()).optional()`

---

## Module: `src/errors.ts`

### `TaigaApiError`

Extends `Error`. Thrown by the HTTP client for any non-2xx response.

| Field     | Type     | Description                         |
|-----------|----------|-------------------------------------|
| `status`  | `number` | HTTP status code                    |
| `details` | `string` | Raw error detail from Taiga API     |
| `message` | `string` | Human-readable message with context |

**Status-specific messages:**

| Status | Message prefix                                              |
|--------|-------------------------------------------------------------|
| 400    | `Bad request — check the parameters you sent`              |
| 401    | `Unauthorized — the auth token is invalid or expired`      |
| 403    | `Forbidden — you don't have permission for this action`    |
| 404    | `Not found — the resource does not exist`                  |
| 5xx    | `Taiga server error (N) — try again later`                 |

---

## Module: `src/logger.ts`

Simple structured logger writing to stderr. No external dependencies.

```typescript
logger.debug("message", { key: value });
logger.info("message");
logger.warn("message", { status: 404 });
logger.error("message", { error: String(err) });
```

Output format: `<ISO timestamp> [LEVEL] message {meta}`

---

## Module: `tools/projects.ts`

### `taiga_list_projects`

Lists all accessible projects.

**Inputs:** none

**Behaviour:**
1. Calls `listProjects()`
2. Returns formatted list with `formatProject()` per project
3. Header: `"N projects found:\n"`

---

### `taiga_get_project`

Gets project details by ID or slug.

**Inputs:**
```typescript
{
  project_id?: z.number().int().positive(),
  slug?: z.string(),
}
```

**Validation:** at least one of `project_id` or `slug` must be present.

**Behaviour:**
1. If `project_id`: calls `getProject(project_id)`
2. If `slug`: calls `getProjectBySlug(slug)`
3. Returns `formatProject(project)`

---

### `taiga_create_project`

Creates a new project.

**Inputs:**
```typescript
{
  name: z.string().min(1),
  description: z.string().optional(),
  is_private: z.boolean().optional().default(false),
}
```

**Behaviour:**
1. Calls `createProject(data)`
2. Returns `"Project created:\n" + formatProject(project)`

---

### `taiga_list_members`

Lists members of a project.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
}
```

**Behaviour:**
1. Calls `listMembers(project_id)`
2. Returns table with `id`, `username`, `full_name` per member

---

## Module: `tools/milestones.ts`

### `taiga_list_milestones`

Lists sprints of a project.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  closed: z.boolean().optional(),  // undefined = all, true = closed only, false = open only
}
```

**Behaviour:**
1. Calls `listMilestones(project_id, closed)`
2. Returns formatted list with `formatMilestone()`

---

### `taiga_get_milestone`

Gets a sprint by ID.

**Inputs:**
```typescript
{
  milestone_id: z.number().int().positive(),
}
```

**Behaviour:**
1. Calls `getMilestone(milestone_id)`
2. Returns `formatMilestone(sprint)` + list of sprint user stories

---

### `taiga_create_milestone`

Creates a new sprint.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  name: z.string().min(1),
  estimated_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimated_finish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}
```

**Behaviour:**
1. Calls `createMilestone({ project: project_id, name, estimated_start, estimated_finish })`
2. Returns `"Sprint created:\n" + formatMilestone(sprint)`

---

## Module: `tools/userstories.ts`

### `taiga_list_userstories`

Lists user stories with optional filters.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  status: z.number().int().positive().optional(),
  tags: z.string().optional(),  // comma-separated tags
}
```

**Behaviour:**
1. Calls `listUserStories({ project: project_id, milestone: milestone_id, ... })`
2. Returns list with `formatUserStory()`

---

### `taiga_get_userstory`

Gets a user story by ID.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
}
```

**Behaviour:**
1. Calls `getUserStory(userstory_id)`
2. Returns `formatUserStory(us)` + full description if present

---

### `taiga_create_userstory`

Creates a user story.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  subject: z.string().min(1),
  description: z.string().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  status: z.number().int().positive().optional(),
}
```

**Behaviour:**
1. Calls `createUserStory({ project: project_id, subject, ... })`
2. Returns `"User story created:\n" + formatUserStory(us)`

---

### `taiga_edit_userstory`

Edits an existing user story. Requires `version` for optimistic concurrency control.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
  version: z.number().int().positive(),  // obtained from a prior GET
  subject: z.string().optional(),
  description: z.string().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  status: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
}
```

**Behaviour:**
1. Calls `editUserStory(userstory_id, version, data)` with only non-undefined fields
2. Returns `"User story updated:\n" + formatUserStory(us)`

---

### `taiga_delete_userstory`

Deletes a user story.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
}
```

**Behaviour:**
1. Calls `deleteUserStory(userstory_id)`
2. Returns `"User story deleted (id: N)"`

---

## Module: `tools/tasks.ts`

### `taiga_list_tasks`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive().optional(),
  milestone_id: z.number().int().positive().optional(),
  userstory_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  status: z.number().int().positive().optional(),
}
```

### `taiga_get_task`

**Inputs:** `{ task_id: z.number().int().positive() }`

### `taiga_create_task`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  subject: z.string().min(1),
  description: z.string().optional(),
  userstory_id: z.number().int().positive().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  status: z.number().int().positive().optional(),
}
```

### `taiga_edit_task`

**Inputs:**
```typescript
{
  task_id: z.number().int().positive(),
  version: z.number().int().positive(),
  subject: z.string().optional(),
  description: z.string().optional(),
  userstory_id: z.number().int().positive().nullable().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  status: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
}
```

### `taiga_delete_task`

**Inputs:** `{ task_id: z.number().int().positive() }`

*Behaviours follow the same pattern as userstories, adapting field names.*

---

## Module: `tools/issues.ts`

### `taiga_list_issues`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  status: z.number().int().positive().optional(),
  type: z.number().int().positive().optional(),
  priority: z.number().int().positive().optional(),
  severity: z.number().int().positive().optional(),
}
```

### `taiga_get_issue`

**Inputs:** `{ issue_id: z.number().int().positive() }`

### `taiga_create_issue`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  subject: z.string().min(1),
  description: z.string().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  status: z.number().int().positive().optional(),
  type: z.number().int().positive().optional(),
  priority: z.number().int().positive().optional(),
  severity: z.number().int().positive().optional(),
}
```

### `taiga_edit_issue`

**Inputs:**
```typescript
{
  issue_id: z.number().int().positive(),
  version: z.number().int().positive(),
  subject: z.string().optional(),
  description: z.string().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  status: z.number().int().positive().optional(),
  type: z.number().int().positive().optional(),
  priority: z.number().int().positive().optional(),
  severity: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
}
```

### `taiga_delete_issue`

**Inputs:** `{ issue_id: z.number().int().positive() }`

---

## Module: `tools/epics.ts`

### `taiga_list_epics`

**Inputs:** `{ project_id: z.number().int().positive() }`

### `taiga_get_epic`

**Inputs:** `{ epic_id: z.number().int().positive() }`

### `taiga_create_epic`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  subject: z.string().min(1),
  description: z.string().optional(),
  assigned_to: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  status: z.number().int().positive().optional(),
}
```

### `taiga_edit_epic`

**Inputs:**
```typescript
{
  epic_id: z.number().int().positive(),
  version: z.number().int().positive(),
  subject: z.string().optional(),
  description: z.string().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  status: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
}
```

*No `delete_epic` in the current service API — do not implement.*

---

## Module: `tools/wiki-search.ts`

### `taiga_list_wiki_pages`

**Inputs:** `{ project_id: z.number().int().positive() }`

### `taiga_get_wiki_page`

**Inputs:**
```typescript
{
  page_id: z.number().int().positive().optional(),
  project_id: z.number().int().positive().optional(),
  slug: z.string().optional(),
}
```

**Validation:** (`page_id`) or (`project_id` + `slug`).

### `taiga_create_wiki_page`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Lowercase, numbers and hyphens only"),
  content: z.string(),
}
```

### `taiga_edit_wiki_page`

**Inputs:**
```typescript
{
  page_id: z.number().int().positive(),
  version: z.number().int().positive(),
  content: z.string(),
}
```

### `taiga_search`

Global text search within a project.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  text: z.string().min(1),
}
```

**Behaviour:**
1. Calls `searchProject(project_id, text)`
2. Shows results grouped by type (epics, userstories, issues, tasks, wikipages)
3. Header: `"Search: N results for '<text>'\n"`
4. Each section uses its corresponding formatter

---

## Tools summary

| Module      | Tools                                                                    | Total |
|-------------|--------------------------------------------------------------------------|-------|
| projects    | list, get, create, list_members                                          | 4     |
| milestones  | list, get, create                                                        | 3     |
| userstories | list, get, create, edit, delete                                          | 5     |
| tasks       | list, get, create, edit, delete                                          | 5     |
| issues      | list, get, create, edit, delete                                          | 5     |
| epics       | list, get, create, edit                                                  | 4     |
| wiki-search | list_wiki_pages, get_wiki_page, create_wiki_page, edit_wiki_page, search | 5     |
| **Total**   |                                                                          | **31**|
