import { describe, it, expect, vi, beforeEach } from "vitest";
import { TaigaApiError } from "../src/errors.js";

// Mock fetch globally before importing the service
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import after stubbing so the module picks up the mock
const { configure, listProjects, getProject, createProject } = await import("../src/services/taiga.js");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHeaders(entries: Record<string, string> = {}) {
  return { get: (key: string) => entries[key.toLowerCase()] ?? null };
}

function mockResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: makeHeaders(headers),
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

function mockErrorResponse(status: number, body: unknown) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: String(status),
    headers: makeHeaders(),
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  configure("https://taiga.example.com", "test-token");
  mockFetch.mockReset();
});

// ─── configure + auth header ──────────────────────────────────────────────────

describe("HTTP client", () => {
  it("sends Authorization header with the token", async () => {
    mockFetch.mockReturnValue(mockResponse(200, []));
    await listProjects();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Authorization"]).toBe("Bearer test-token");
  });

  it("sends Content-Type: application/json", async () => {
    mockFetch.mockReturnValue(mockResponse(200, []));
    await listProjects();
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("builds the correct URL", async () => {
    mockFetch.mockReturnValue(mockResponse(200, []));
    await listProjects();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/^https:\/\/taiga\.example\.com\/api\/v1\/projects/);
  });

  it("strips trailing slash from base URL", async () => {
    configure("https://taiga.example.com/", "test-token");
    mockFetch.mockReturnValue(mockResponse(200, []));
    await listProjects();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toMatch(/^https:\/\/taiga\.example\.com\/api\/v1\/projects/);
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe("HTTP error handling", () => {
  it("throws TaigaApiError on 400", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(400, { _error_message: "invalid subject" }));
    await expect(listProjects()).rejects.toThrow(TaigaApiError);
    await expect(listProjects()).rejects.toMatchObject({ status: 400 });
  });

  it("throws TaigaApiError on 401", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(401, { detail: "token expired" }));
    await expect(listProjects()).rejects.toThrow(TaigaApiError);
    await expect(listProjects()).rejects.toMatchObject({ status: 401 });
  });

  it("throws TaigaApiError on 403", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(403, { detail: "forbidden" }));
    await expect(listProjects()).rejects.toMatchObject({ status: 403 });
  });

  it("throws TaigaApiError on 404", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(404, { detail: "not found" }));
    await expect(getProject(999)).rejects.toMatchObject({ status: 404 });
  });

  it("throws TaigaApiError on 500", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(500, { detail: "internal error" }));
    await expect(listProjects()).rejects.toMatchObject({ status: 500 });
  });

  it("uses _error_message field when present", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(400, { _error_message: "subject is required" }));
    await expect(listProjects()).rejects.toMatchObject({ details: "subject is required" });
  });

  it("falls back to detail field", async () => {
    mockFetch.mockReturnValue(mockErrorResponse(404, { detail: "Project not found" }));
    await expect(listProjects()).rejects.toMatchObject({ details: "Project not found" });
  });

  it("falls back to statusText when body is not parseable", async () => {
    mockFetch.mockReturnValue(Promise.resolve({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      headers: makeHeaders(),
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response));
    await expect(listProjects()).rejects.toMatchObject({ status: 503, details: "Service Unavailable" });
  });
});

// ─── Successful responses ─────────────────────────────────────────────────────

describe("listProjects", () => {
  it("returns parsed array on 200", async () => {
    const payload = [{ id: 1, name: "Proj A" }, { id: 2, name: "Proj B" }];
    mockFetch.mockReturnValue(mockResponse(200, payload, { "x-pagination-count": "2" }));
    const result = await listProjects();
    expect(result.items).toEqual(payload);
    expect(result.total).toBe(2);
  });

  it("returns empty array when API returns empty", async () => {
    mockFetch.mockReturnValue(mockResponse(200, []));
    const result = await listProjects();
    expect(result.items).toEqual([]);
  });

  it("sets hasMore when x-pagination-next header is present", async () => {
    const payload = [{ id: 1, name: "Proj A" }];
    mockFetch.mockReturnValue(mockResponse(200, payload, { "x-pagination-next": "2", "x-pagination-count": "10" }));
    const result = await listProjects();
    expect(result.hasMore).toBe(true);
    expect(result.total).toBe(10);
  });
});

describe("getProject", () => {
  it("calls the correct endpoint", async () => {
    mockFetch.mockReturnValue(mockResponse(200, { id: 5, name: "Test" }));
    await getProject(5);
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/projects/5");
  });
});

describe("createProject", () => {
  it("sends POST with correct body", async () => {
    mockFetch.mockReturnValue(mockResponse(201, { id: 10, name: "New Proj" }));
    await createProject({ name: "New Proj", is_private: false });
    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body as string)).toMatchObject({ name: "New Proj" });
  });
});
