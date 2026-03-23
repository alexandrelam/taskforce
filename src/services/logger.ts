const LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
} as const;

type LogLevel = keyof typeof LEVEL_ORDER;

function resolveLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase() as LogLevel | undefined;
  if (configured && configured in LEVEL_ORDER) {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

const activeLevel = resolveLevel();

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[activeLevel];
}

function write(level: LogLevel, message: string, ...args: unknown[]) {
  if (!shouldLog(level)) {
    return;
  }

  const prefix = `[${level}]`;
  if (level === "error") {
    console.error(prefix, message, ...args);
    return;
  }
  if (level === "warn") {
    console.warn(prefix, message, ...args);
    return;
  }
  console.log(prefix, message, ...args);
}

export const logger = {
  debug: (message: string, ...args: unknown[]) => write("debug", message, ...args),
  info: (message: string, ...args: unknown[]) => write("info", message, ...args),
  warn: (message: string, ...args: unknown[]) => write("warn", message, ...args),
  error: (message: string, ...args: unknown[]) => write("error", message, ...args),
};
