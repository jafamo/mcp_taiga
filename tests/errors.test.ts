import { describe, it, expect } from "vitest";
import { TaigaApiError } from "../src/errors.js";

describe("TaigaApiError", () => {
  it("is an instance of Error", () => {
    const err = new TaigaApiError(404, "not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TaigaApiError);
  });

  it("exposes status and details", () => {
    const err = new TaigaApiError(400, "invalid field");
    expect(err.status).toBe(400);
    expect(err.details).toBe("invalid field");
  });

  it("sets name to TaigaApiError", () => {
    expect(new TaigaApiError(500, "oops").name).toBe("TaigaApiError");
  });

  it("produces actionable message for 400", () => {
    const err = new TaigaApiError(400, "subject is required");
    expect(err.message).toContain("Bad request");
    expect(err.message).toContain("subject is required");
  });

  it("produces actionable message for 401", () => {
    const err = new TaigaApiError(401, "token expired");
    expect(err.message).toContain("Unauthorized");
    expect(err.message).toContain("token expired");
  });

  it("produces actionable message for 403", () => {
    const err = new TaigaApiError(403, "no permission");
    expect(err.message).toContain("Forbidden");
    expect(err.message).toContain("no permission");
  });

  it("produces actionable message for 404", () => {
    const err = new TaigaApiError(404, "project not found");
    expect(err.message).toContain("Not found");
    expect(err.message).toContain("project not found");
  });

  it("produces actionable message for 500", () => {
    const err = new TaigaApiError(500, "internal error");
    expect(err.message).toContain("server error");
    expect(err.message).toContain("500");
    expect(err.message).toContain("internal error");
  });

  it("produces actionable message for other 5xx", () => {
    const err = new TaigaApiError(503, "unavailable");
    expect(err.message).toContain("server error");
    expect(err.message).toContain("503");
  });

  it("handles unknown status codes", () => {
    const err = new TaigaApiError(418, "I'm a teapot");
    expect(err.message).toContain("418");
    expect(err.message).toContain("I'm a teapot");
  });
});
