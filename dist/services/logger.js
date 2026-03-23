"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const LEVEL_ORDER = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
};
function resolveLevel() {
    const configured = process.env.LOG_LEVEL?.toLowerCase();
    if (configured && configured in LEVEL_ORDER) {
        return configured;
    }
    return process.env.NODE_ENV === "production" ? "info" : "debug";
}
const activeLevel = resolveLevel();
function shouldLog(level) {
    return LEVEL_ORDER[level] >= LEVEL_ORDER[activeLevel];
}
function write(level, message, ...args) {
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
exports.logger = {
    debug: (message, ...args) => write("debug", message, ...args),
    info: (message, ...args) => write("info", message, ...args),
    warn: (message, ...args) => write("warn", message, ...args),
    error: (message, ...args) => write("error", message, ...args),
};
//# sourceMappingURL=logger.js.map