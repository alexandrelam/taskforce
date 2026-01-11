import type { Server } from "http";
export declare const tmuxAvailable: boolean;
export declare function sanitizeSessionId(sessionId: string): string;
export declare function killTmuxSession(ticketId: string): void;
export declare function setupPtyWebSocket(server: Server): void;
//# sourceMappingURL=pty.d.ts.map