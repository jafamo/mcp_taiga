// ─── Taiga API Error ──────────────────────────────────────────────────────────

export class TaigaApiError extends Error {
  readonly status: number;
  readonly details: string;

  constructor(status: number, details: string) {
    super(TaigaApiError.buildMessage(status, details));
    this.name = "TaigaApiError";
    this.status = status;
    this.details = details;
  }

  private static buildMessage(status: number, details: string): string {
    switch (status) {
      case 400: return `Bad request — check the parameters you sent. Details: ${details}`;
      case 401: return `Unauthorized — the auth token is invalid or expired. Details: ${details}`;
      case 403: return `Forbidden — you don't have permission for this action. Details: ${details}`;
      case 404: return `Not found — the resource does not exist. Details: ${details}`;
      default:
        if (status >= 500) return `Taiga server error (${status}) — try again later. Details: ${details}`;
        return `Taiga API error (${status}). Details: ${details}`;
    }
  }
}
