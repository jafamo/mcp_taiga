# TODO — Pending improvements

## 🔴 P0 — Critical

### 1. Structured logging
- [x] Create `src/logger.ts` module with INFO/WARN/ERROR/DEBUG levels
- [x] Configure level via `LOG_LEVEL` environment variable
- [x] Add logs for every HTTP call in `src/services/taiga.ts` (method, URL, status, response time)
- [x] Log configuration on startup (without exposing tokens)
- [x] Add logs in every tool on invocation (name, parameters, result)

### 2. Improved error handling
- [x] Create `TaigaApiError` class with `status`, `message`, `details` fields
- [x] Differentiate errors: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- [x] Add context in tool `catch` blocks (which tool, which parameters)
- [x] Improve error messages returned to the LLM to be actionable

---

## 🟠 P1 — Important

### 3. Unit tests
- [x] Install `vitest` + `@vitest/coverage-v8`
- [x] Add `test` script to `package.json`
- [x] Tests for `src/services/taiga.ts` (mock `fetch`, test 200/400/401/404/500)
- [x] Tests for `src/formats.ts` (edge cases: nulls, empty arrays, empty strings)
- [x] Zod schema validation tests (valid and invalid input per tool)

### 4. API response validation
- [x] Define Zod schemas for Taiga responses (Project, UserStory, Task, etc.)
- [x] Validate responses before casting as `T`
- [x] Handle cases where the response does not match the expected schema

### 5. Pagination in list endpoints
- [x] Add optional `page` and `page_size` parameters to all `list_*` tools
- [x] Document default values in Zod schemas

---

## 🟡 P2 — Nice to have

### 6. In-memory cache
- [ ] Implement simple cache with TTL (5 minutes) for read-only calls
- [ ] Apply to: `listProjects`, `listMembers`, `getProject`
- [ ] Add optional `force_refresh` parameter to invalidate cache

### 7. Retry with exponential backoff
- [ ] Implement automatic retry for 5xx errors and timeouts
- [ ] Maximum 3 retries with backoff (1s, 2s, 4s)
- [ ] Do not retry 4xx errors (client-side errors)

### 8. Consistent language
- [x] Decide on a single language for tool descriptions (currently mixing Spanish/English)
- [x] Unify error messages (currently mixing Spanish/English/emojis)

---

## ✅ Already in good shape

- Clear and well-separated folder structure
- TypeScript with `strict: true`
- Complete Zod schemas for input parameters
- Optimistic concurrency control with mandatory `version` on edits
- Centralized formatters in `formats.ts`
- Documentation in `SPECS.md` and `DECISIONS.md`
