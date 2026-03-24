# Taiga MCP Server

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![MCP](https://img.shields.io/badge/MCP-Model_Context_Protocol-blueviolet?style=flat)
![Taiga](https://img.shields.io/badge/Taiga-API_v1-4CAF50?style=flat)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat&logo=zod&logoColor=white)

Servidor MCP (Model Context Protocol) para integrar Taiga con Claude y otros clientes LLM.

Permite gestionar proyectos, sprints, user stories, tareas, issues, epics y wiki directamente desde el asistente.

---

## Requisitos

- Node.js >= 20
- Acceso a una instancia de Taiga (cloud o self-hosted)
- Token de autenticación de Taiga

## Instalación

```bash
cd taiga
npm install
npm run build
```

## Obtener el token de Taiga

```bash
curl -s -X POST https://<tu-instancia>/api/v1/auth \
  -H "Content-Type: application/json" \
  -d '{"type":"normal","username":"<usuario>","password":"<contraseña>"}' \
  | grep auth_token
```

## Configuración

### Variables de entorno

| Variable          | Descripción                                      | Ejemplo                                  |
|-------------------|--------------------------------------------------|------------------------------------------|
| `TAIGA_URL`       | URL base de tu instancia Taiga                   | `https://taiga.miempresa.com`            |
| `TAIGA_AUTH_TOKEN`| Token de autenticación obtenido con el paso anterior | `eyJ0eXAiOiJKV1QiLCJhbGci...`       |

### Claude Desktop (`~/.config/Claude/claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "taiga": {
      "command": "node",
      "args": ["/ruta/absoluta/taiga/dist/index.js"],
      "env": {
        "TAIGA_URL": "https://<tu-instancia>",
        "TAIGA_AUTH_TOKEN": "<tu-token>"
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
      "args": ["/ruta/absoluta/taiga/dist/index.js"],
      "env": {
        "TAIGA_URL": "https://taiga.miempresa.com",
        "TAIGA_AUTH_TOKEN": "tu-token-aqui"
      }
    }
  }
}
```

---

## Tools disponibles (31 en total)

### Proyectos
| Tool | Descripción |
|------|-------------|
| `taiga_list_projects` | Lista todos los proyectos |
| `taiga_get_project` | Detalle de un proyecto por ID o slug |
| `taiga_create_project` | Crea un proyecto nuevo |
| `taiga_list_members` | Lista miembros de un proyecto |

### Sprints (Milestones)
| Tool | Descripción |
|------|-------------|
| `taiga_list_milestones` | Lista sprints de un proyecto |
| `taiga_get_milestone` | Detalle de un sprint |
| `taiga_create_milestone` | Crea un sprint |

### User Stories
| Tool | Descripción |
|------|-------------|
| `taiga_list_userstories` | Lista user stories con filtros |
| `taiga_get_userstory` | Detalle de una user story |
| `taiga_create_userstory` | Crea una user story |
| `taiga_edit_userstory` | Edita una user story (requiere `version`) |
| `taiga_delete_userstory` | Elimina una user story |

### Tareas
| Tool | Descripción |
|------|-------------|
| `taiga_list_tasks` | Lista tareas con filtros |
| `taiga_get_task` | Detalle de una tarea |
| `taiga_create_task` | Crea una tarea |
| `taiga_edit_task` | Edita una tarea (requiere `version`) |
| `taiga_delete_task` | Elimina una tarea |

### Issues
| Tool | Descripción |
|------|-------------|
| `taiga_list_issues` | Lista issues con filtros |
| `taiga_get_issue` | Detalle de un issue |
| `taiga_create_issue` | Crea un issue |
| `taiga_edit_issue` | Edita un issue (requiere `version`) |
| `taiga_delete_issue` | Elimina un issue |

### Epics
| Tool | Descripción |
|------|-------------|
| `taiga_list_epics` | Lista epics de un proyecto |
| `taiga_get_epic` | Detalle de un epic |
| `taiga_create_epic` | Crea un epic |
| `taiga_edit_epic` | Edita un epic (requiere `version`) |

### Wiki y Búsqueda
| Tool | Descripción |
|------|-------------|
| `taiga_list_wiki_pages` | Lista páginas wiki de un proyecto |
| `taiga_get_wiki_page` | Obtiene una página wiki por ID o slug |
| `taiga_create_wiki_page` | Crea una página wiki |
| `taiga_edit_wiki_page` | Edita una página wiki (requiere `version`) |
| `taiga_search` | Búsqueda global en un proyecto |

---

## Desarrollo

```bash
npm run dev     # Compilación en modo watch
npm run build   # Compilación para producción
npm start       # Arrancar el servidor compilado
```

## Arquitectura

Ver [`SPECS.md`](./SPECS.md) para especificaciones detalladas de cada tool.
Ver [`DECISIONS.md`](./DECISIONS.md) para el log de decisiones de diseño.

```
src/
├── index.ts          # Entry point y configuración del servidor MCP
├── types.ts          # Interfaces TypeScript de todas las entidades Taiga
├── formats.ts        # Funciones de formateo para respuestas legibles
├── services/
│   └── taiga.ts      # Cliente HTTP y funciones de la API de Taiga
└── tools/            # Un fichero por entidad, cada uno registra sus MCP tools
    ├── projects.ts
    ├── milestones.ts
    ├── userstories.ts
    ├── tasks.ts
    ├── issues.ts
    ├── epics.ts
    └── wiki-search.ts
```
