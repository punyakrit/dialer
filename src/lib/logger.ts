type Level = "debug" | "info" | "warn" | "error";

const levels: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function resolveMinLevel(): number {
  const env = (typeof process !== "undefined" && process.env.LOG_LEVEL) as
    | Level
    | undefined;
  return levels[env ?? "info"];
}

function write(level: Level, msg: string, fields?: Record<string, unknown>) {
  if (levels[level] < resolveMinLevel()) return;
  const payload = {
    t: new Date().toISOString(),
    level,
    msg,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};
