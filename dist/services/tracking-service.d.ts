export declare function applyTrackingState(cwd: string, column: "To Do" | "In Progress"): Promise<{
    success: false;
    error: string;
    status: number;
    ticketId?: undefined;
    title?: undefined;
} | {
    success: false;
    error: string;
    ticketId: string;
    status: number;
    title?: undefined;
} | {
    success: true;
    ticketId: string;
    title: string;
    error?: undefined;
    status?: undefined;
}>;
//# sourceMappingURL=tracking-service.d.ts.map