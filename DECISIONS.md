# Taiga MCP Server — Decision Log

> Registro cronológico de decisiones de arquitectura y diseño.
> Formato: ADR ligero (contexto → decisión → consecuencias).

---

## 2026-03-24 — Inicio del proyecto

### D-001: Estructura de directorios `src/`

**Contexto:** Los ficheros iniciales (`index.ts`, `taiga.ts`, `types.ts`, `formats.ts`) estaban en la raíz del proyecto. El `tsconfig.json` tenía `rootDir: ./src` y el `index.ts` importaba desde `./services/taiga.js` y `./tools/*.js`, lo que causaba un mismatch.

**Decisión:** Mover todos los ficheros fuente a `src/`, respetando la estructura que el `index.ts` ya esperaba:
- `src/index.ts`
- `src/types.ts`
- `src/formats.ts`
- `src/services/taiga.ts`
- `src/tools/*.ts`

**Por qué no alternativa (mantener en raíz):** Habría requerido cambiar todas las importaciones en `index.ts` y romper la convención de `tsconfig.json`. La estructura `src/` es más mantenible y es el estándar de la industria.

**Consecuencias:** Las importaciones relativas en `taiga.ts` y `formats.ts` (que usan `../types.js`) son correctas una vez movidos a `src/services/` y cualquier subcarpeta de `src/`.

---

### D-002: Autenticación por token, no por usuario/contraseña

**Contexto:** El servicio `taiga.ts` tiene implementada `authenticate()` pero `index.ts` exige `TAIGA_AUTH_TOKEN` directamente como variable de entorno.

**Decisión:** Mantener autenticación por token estático (`Bearer` token). La función `authenticate()` existe en el servicio pero no se expone como MCP tool.

**Por qué:** Los MCP servers arrancan como procesos de larga duración. Gestionar ciclo de vida de tokens (expiración, refresco) añade complejidad innecesaria para el caso de uso actual. El token se obtiene manualmente una vez y se configura en el entorno.

**Consecuencias:** El usuario debe renovar el token manualmente si expira.

---

### D-003: Un fichero de tools por entidad

**Contexto:** Podría haberse puesto todo en un único fichero `tools.ts` o agrupar de otra forma.

**Decisión:** Un fichero por entidad de Taiga (`projects.ts`, `milestones.ts`, etc.), cada uno exportando una función `registerXxxTools(server)`.

**Por qué:** Facilita navegación, permite añadir/quitar entidades sin tocar otros módulos, y mantiene los ficheros en un tamaño razonable (~100-150 líneas cada uno).

---

### D-004: Nombres de tools con prefijo `taiga_`

**Contexto:** Los nombres de MCP tools deben ser únicos globalmente en el cliente que los consume.

**Decisión:** Prefijo `taiga_` en todos los tool names (ej: `taiga_list_projects`, `taiga_create_task`).

**Por qué:** Evita colisiones con otros MCP servers activos en el mismo cliente. El prefijo es descriptivo y corto.

---

### D-005: Control de concurrencia mediante `version`

**Contexto:** La API de Taiga requiere el campo `version` en operaciones PATCH para evitar sobrescribir cambios concurrentes.

**Decisión:** Las tools de edición (`edit_*`) requieren `version` como parámetro obligatorio. El usuario/LLM debe obtenerlo previamente con un `get_*`.

**Por qué:** No hacerlo (e.g., obtener la versión automáticamente con un GET previo) añade una llamada de red oculta y puede causar race conditions. Exigir `version` al llamante es el contrato correcto con la API de Taiga.

**Consecuencias:** Flujo típico de edición: `get` → leer `version` → `edit` con esa versión.

---

### D-006: No implementar `delete_epic`

**Contexto:** La API de Taiga sí permite borrar epics, pero la función no está implementada en `taiga.ts`.

**Decisión:** No añadir `taiga_delete_epic` en esta iteración.

**Por qué:** No estaba en el servicio original y no fue solicitado explícitamente. Se puede añadir en el futuro si hay necesidad. YAGNI.

---

## Pendiente de decisión

- **Paginación:** Las listas actualmente retornan todos los resultados sin paginar. Para proyectos grandes esto puede ser un problema. Decidir si añadir parámetros `page`/`page_size` o límites automáticos.
- **Idioma de las descripciones de tools:** Las descripciones de las tools (que ve el LLM) están en español o en inglés. Decidir idioma consistente.
- **Logging:** El servidor usa `console.error` para logs. Considerar si añadir logs más estructurados.
