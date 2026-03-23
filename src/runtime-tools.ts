import { accessSync, constants } from "fs";
import path from "path";

function isExecutable(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function commandExists(command: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!command) return false;

  if (command.includes(path.sep)) {
    return isExecutable(command);
  }

  const pathEntries = (env.PATH || "").split(path.delimiter).filter(Boolean);
  return pathEntries.some((entry) => isExecutable(path.join(entry, command)));
}

export function resolveShell(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [env.SHELL, "/bin/sh", "/usr/bin/sh"];
  for (const candidate of candidates) {
    if (candidate && commandExists(candidate, env)) {
      return candidate;
    }
  }
  return null;
}

export function missingCommandMessage(command: string): string {
  return `${command} is not available in the runtime environment`;
}
