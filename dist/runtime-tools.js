"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandExists = commandExists;
exports.resolveShell = resolveShell;
exports.missingCommandMessage = missingCommandMessage;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
function isExecutable(filePath) {
    try {
        (0, fs_1.accessSync)(filePath, fs_1.constants.X_OK);
        return true;
    }
    catch {
        return false;
    }
}
function commandExists(command, env = process.env) {
    if (!command)
        return false;
    if (command.includes(path_1.default.sep)) {
        return isExecutable(command);
    }
    const pathEntries = (env.PATH || "").split(path_1.default.delimiter).filter(Boolean);
    return pathEntries.some((entry) => isExecutable(path_1.default.join(entry, command)));
}
function resolveShell(env = process.env) {
    const candidates = [env.SHELL, "/bin/sh", "/usr/bin/sh"];
    for (const candidate of candidates) {
        if (candidate && commandExists(candidate, env)) {
            return candidate;
        }
    }
    return null;
}
function missingCommandMessage(command) {
    return `${command} is not available in the runtime environment`;
}
//# sourceMappingURL=runtime-tools.js.map