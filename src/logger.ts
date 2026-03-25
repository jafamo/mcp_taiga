// ─── Logger ───────────────────────────────────────────────────────────────────
// All output goes to stderr — stdout is reserved for the MCP stdio protocol.
//
// Log level is controlled via the LOG_LEVEL environment variable:
//   LOG_LEVEL=debug  → all messages
//   LOG_LEVEL=info   → info, warn, error  (default)
//   LOG_LEVEL=warn   → warn, error
//   LOG_LEVEL=error  → error only
//   LOG_LEVEL=silent → nothing

type Level = "debug" | "info" | "warn" | "error" | "silent";

const LEVELS: Record<Level, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

function resolveLevel(): Level {
  const raw = (process.env["LOG_LEVEL"] ?? "info").toLowerCase();
  return (raw in LEVELS ? raw : "info") as Level;
}

const currentLevel = LEVELS[resolveLevel()];

function log(level: Exclude<Level, "silent">, message: string, meta?: Record<string, unknown>): void {
  if (LEVELS[level] < currentLevel) return;

  const ts = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  process.stderr.write(`${ts} [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}\n`);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log("debug", message, meta),
  info:  (message: string, meta?: Record<string, unknown>) => log("info",  message, meta),
  warn:  (message: string, meta?: Record<string, unknown>) => log("warn",  message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log("error", message, meta),
};
