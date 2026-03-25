# Taiga MCP Server

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-blueviolet?style=flat)
![Taiga](https://img.shields.io/badge/Taiga-API_v1-4CAF50?style=flat)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat&logo=zod&logoColor=white)

MCP (Model Context Protocol) server to integrate Taiga with Claude and other LLM clients.

Manage projects, sprints, user stories, tasks, issues, epics, and wiki directly from your assistant.

---

## Requirements

- Node.js >= 20
- Access to a Taiga instance (cloud or self-hosted)
- Taiga authentication token

## Installation

```bash
cd taiga
npm install
npm run build
```

## Getting the Taiga token

```bash
curl -s -X POST https://<your-instance>/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"type":"normal","username":"<username>","password":"<password>"}' \
  | grep auth_token
```

## Configuration

### Environment variables

| Variable           | Description                                        | Example                                  |
|--------------------|----------------------------------------------------|------------------------------------------|
| `TAIGA_URL`        | Base URL of your Taiga instance                    | `https://taiga.mycompany.com`            |
| `TAIGA_AUTH_TOKEN` | Authentication token obtained in the previous step | `eyJ0eXAiOiJKV1QiLCJhbGci...`           |

### Claude Desktop (`~/.config/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "taiga": {
      "command": "node",
      "args": ["/absolute/path/to/taiga/dist/index.js"],
      "env": {
        "TAIGA_URL": "https://<your-instance>",
        "TAIGA_AUTH_TOKEN": "<your-token>"
      }
    }
  }
}
```

### Claude Code (`.claude/settings.json`)

```json
{
  "mcpServers": {
    "taiga": {
      "command": "node",
      "args": ["/absolute/path/to/taiga/dist/index.js"],
      "env": {
        "TAIGA_URL": "https://taiga.mycompany.com",
        "TAIGA_AUTH_TOKEN": "your-token-here"
      }
    }
  }
}
```

---

## Available tools (31 total)

### Projects
| Tool | Description |
|------|-------------|
| `taiga_list_projects` | List all projects |
| `taiga_get_project` | Project detail by ID or slug |
| `taiga_create_project` | Create a new project |
| `taiga_list_members` | List members of a project |

### Sprints (Milestones)
| Tool | Description |
|------|-------------|
| `taiga_list_milestones` | List sprints of a project |
| `taiga_get_milestone` | Sprint detail |
| `taiga_create_milestone` | Create a sprint |

### User Stories
| Tool | Description |
|------|-------------|
| `taiga_list_userstories` | List user stories with filters |
| `taiga_get_userstory` | User story detail |
| `taiga_create_userstory` | Create a user story |
| `taiga_edit_userstory` | Edit a user story (requires `version`) |
| `taiga_delete_userstory` | Delete a user story |

### Tasks
| Tool | Description |
|------|-------------|
| `taiga_list_tasks` | List tasks with filters |
| `taiga_get_task` | Task detail |
| `taiga_create_task` | Create a task |
| `taiga_edit_task` | Edit a task (requires `version`) |
| `taiga_delete_task` | Delete a task |

### Issues
| Tool | Description |
|------|-------------|
| `taiga_list_issues` | List issues with filters |
| `taiga_get_issue` | Issue detail |
| `taiga_create_issue` | Create an issue |
| `taiga_edit_issue` | Edit an issue (requires `version`) |
| `taiga_delete_issue` | Delete an issue |

### Epics
| Tool | Description |
|------|-------------|
| `taiga_list_epics` | List epics of a project |
| `taiga_get_epic` | Epic detail |
| `taiga_create_epic` | Create an epic |
| `taiga_edit_epic` | Edit an epic (requires `version`) |

### Wiki & Search
| Tool | Description |
|------|-------------|
| `taiga_list_wiki_pages` | List wiki pages of a project |
| `taiga_get_wiki_page` | Get a wiki page by ID or slug |
| `taiga_create_wiki_page` | Create a wiki page |
| `taiga_edit_wiki_page` | Edit a wiki page (requires `version`) |
| `taiga_search` | Global search within a project |

---

## Development

```bash
npm run dev     # Watch mode compilation
npm run build   # Production build
npm start       # Start the compiled server
```

## Architecture

See [`SPECS.md`](./SPECS.md) for detailed tool specifications.
See [`DECISIONS.md`](./DECISIONS.md) for the design decisions log.

```
src/
├── index.ts          # Entry point and MCP server configuration
├── types.ts          # TypeScript interfaces for all Taiga entities
├── formats.ts        # Formatting functions for readable responses
├── services/
│   └── taiga.ts      # HTTP client and Taiga API functions
└── tools/            # One file per entity, each registers its MCP tools
    ├── projects.ts
    ├── milestones.ts
    ├── userstories.ts
    ├── tasks.ts
    ├── issues.ts
    ├── epics.ts
    └── wiki-search.ts
```
