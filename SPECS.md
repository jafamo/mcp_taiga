# Taiga MCP Server — Especificaciones

> Fuente de verdad para la implementación. Revisar antes de escribir o modificar código.

---

## Estructura de ficheros objetivo

```
taiga/
├── src/
│   ├── index.ts                  # Entry point, orquestación
│   ├── types.ts                  # Interfaces TypeScript de Taiga
│   ├── formats.ts                # Formateadores de respuesta
│   ├── services/
│   │   └── taiga.ts              # Cliente HTTP + funciones de API
│   └── tools/
│       ├── projects.ts           # registerProjectTools()
│       ├── milestones.ts         # registerMilestoneTools()
│       ├── userstories.ts        # registerUserStoryTools()
│       ├── tasks.ts              # registerTaskTools()
│       ├── issues.ts             # registerIssueTools()
│       ├── epics.ts              # registerEpicTools()
│       └── wiki-search.ts        # registerWikiAndSearchTools()
├── dist/                         # Compilado (generado, no en git)
├── package.json
├── tsconfig.json
├── SPECS.md
├── DECISIONS.md
└── README.md
```

---

## Convenciones generales

### Firma de registerXxxTools

```typescript
export function registerXxxTools(server: McpServer): void
```

Cada módulo recibe la instancia `McpServer` y registra sus tools con `server.tool()`.

### Respuestas

- Siempre usar `textResponse(text)` para éxito y `errorResponse(error)` para error.
- Las operaciones de lista deben mostrar un resumen con conteo: `"X proyectos encontrados:\n..."`.
- Las operaciones de creación/edición deben confirmar con el objeto formateado.
- Las operaciones de borrado deben confirmar con mensaje simple: `"Eliminado correctamente (id: N)"`.

### Manejo de errores

Cada handler de tool debe estar envuelto en `try/catch` y retornar `errorResponse(error)`.

```typescript
server.tool("nombre_tool", schema, async (params) => {
  try {
    // lógica
    return textResponse(resultado);
  } catch (error) {
    return errorResponse(error);
  }
});
```

### Schemas Zod

- Parámetros requeridos: `z.string()`, `z.number().int().positive()`
- Parámetros opcionales: `.optional()`
- IDs numéricos: `z.number().int().positive()`
- Fechas: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")`
- Arrays de tags: `z.array(z.string()).optional()`

---

## Módulo: `tools/projects.ts`

### `taiga_list_projects`

Lista todos los proyectos accesibles.

**Inputs:** ninguno

**Comportamiento:**
1. Llama `listProjects()`
2. Retorna lista formateada con `formatProject()` para cada proyecto
3. Cabecera: `"N proyectos encontrados:\n"`

---

### `taiga_get_project`

Obtiene detalles de un proyecto por ID o slug.

**Inputs:**
```typescript
{
  project_id?: z.number().int().positive(),  // ID numérico
  slug?: z.string(),                          // slug del proyecto
}
```

**Validación:** al menos uno de `project_id` o `slug` debe estar presente.

**Comportamiento:**
1. Si `project_id`: llama `getProject(project_id)`
2. Si `slug`: llama `getProjectBySlug(slug)`
3. Retorna `formatProject(proyecto)`

---

### `taiga_create_project`

Crea un nuevo proyecto.

**Inputs:**
```typescript
{
  name: z.string().min(1),
  description: z.string().optional(),
  is_private: z.boolean().optional().default(false),
}
```

**Comportamiento:**
1. Llama `createProject(data)`
2. Retorna `"Proyecto creado:\n" + formatProject(proyecto)`

---

### `taiga_list_members`

Lista los miembros de un proyecto.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
}
```

**Comportamiento:**
1. Llama `listMembers(project_id)`
2. Retorna tabla con `id`, `username`, `full_name` de cada miembro

---

## Módulo: `tools/milestones.ts`

### `taiga_list_milestones`

Lista los sprints de un proyecto.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  closed: z.boolean().optional(),  // undefined = todos, true = sólo cerrados, false = sólo abiertos
}
```

**Comportamiento:**
1. Llama `listMilestones(project_id, closed)`
2. Retorna lista formateada con `formatMilestone()`

---

### `taiga_get_milestone`

Obtiene un sprint por ID.

**Inputs:**
```typescript
{
  milestone_id: z.number().int().positive(),
}
```

**Comportamiento:**
1. Llama `getMilestone(milestone_id)`
2. Retorna `formatMilestone(sprint)` + lista de user stories del sprint

---

### `taiga_create_milestone`

Crea un nuevo sprint.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  name: z.string().min(1),
  estimated_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  estimated_finish: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}
```

**Comportamiento:**
1. Llama `createMilestone({ project: project_id, name, estimated_start, estimated_finish })`
2. Retorna `"Sprint creado:\n" + formatMilestone(sprint)`

---

## Módulo: `tools/userstories.ts`

### `taiga_list_userstories`

Lista user stories con filtros opcionales.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive().optional(),
  milestone_id: z.number().int().positive().optional(),
  assigned_to: z.number().int().positive().optional(),
  status: z.number().int().positive().optional(),
  tags: z.string().optional(),  // tags separadas por coma
}
```

**Comportamiento:**
1. Llama `listUserStories({ project: project_id, milestone: milestone_id, ... })`
2. Retorna lista con `formatUserStory()`

---

### `taiga_get_userstory`

Obtiene una user story por ID.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
}
```

**Comportamiento:**
1. Llama `getUserStory(userstory_id)`
2. Retorna `formatUserStory(us)` + descripción completa si existe

---

### `taiga_create_userstory`

Crea una user story.

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

**Comportamiento:**
1. Llama `createUserStory({ project: project_id, subject, ... })`
2. Retorna `"User story creada:\n" + formatUserStory(us)`

---

### `taiga_edit_userstory`

Edita una user story existente. Requiere `version` para control de concurrencia.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
  version: z.number().int().positive(),  // obtenido del GET previo
  subject: z.string().optional(),
  description: z.string().optional(),
  milestone_id: z.number().int().positive().nullable().optional(),
  assigned_to: z.number().int().positive().nullable().optional(),
  status: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
}
```

**Comportamiento:**
1. Llama `editUserStory(userstory_id, version, data)` con sólo los campos no-undefined
2. Retorna `"User story actualizada:\n" + formatUserStory(us)`

---

### `taiga_delete_userstory`

Elimina una user story.

**Inputs:**
```typescript
{
  userstory_id: z.number().int().positive(),
}
```

**Comportamiento:**
1. Llama `deleteUserStory(userstory_id)`
2. Retorna `"User story eliminada (id: N)"`

---

## Módulo: `tools/tasks.ts`

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

*Comportamientos idénticos al patrón de userstories, adaptando nombres de campos.*

---

## Módulo: `tools/issues.ts`

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

## Módulo: `tools/epics.ts`

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

*No hay `delete_epic` en la API de servicio actual — no implementar.*

---

## Módulo: `tools/wiki-search.ts`

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

**Validación:** (`page_id`) o (`project_id` + `slug`).

### `taiga_create_wiki_page`

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
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

Búsqueda global en un proyecto.

**Inputs:**
```typescript
{
  project_id: z.number().int().positive(),
  text: z.string().min(1),
}
```

**Comportamiento:**
1. Llama `searchProject(project_id, text)`
2. Muestra resultados agrupados por tipo (epics, userstories, issues, tasks, wikipages)
3. Cabecera: `"Búsqueda: N resultados para '<text>'\n"`
4. Cada sección con su formateador correspondiente

---

## Resumen de tools por módulo

| Módulo         | Tools                                                                          | Total |
|----------------|--------------------------------------------------------------------------------|-------|
| projects       | list, get, create, list_members                                                | 4     |
| milestones     | list, get, create                                                              | 3     |
| userstories    | list, get, create, edit, delete                                                | 5     |
| tasks          | list, get, create, edit, delete                                                | 5     |
| issues         | list, get, create, edit, delete                                                | 5     |
| epics          | list, get, create, edit                                                        | 4     |
| wiki-search    | list_wiki_pages, get_wiki_page, create_wiki_page, edit_wiki_page, search       | 5     |
| **Total**      |                                                                                | **31**|
