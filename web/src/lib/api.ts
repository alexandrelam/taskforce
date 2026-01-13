import type { Project, TicketResponse, CommitInfo, Pane } from "@/types";

const API_BASE = "http://localhost:3325";

// Projects API
export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    const res = await fetch(`${API_BASE}/api/projects`);
    return res.json();
  },

  create: async (data: {
    name: string;
    path: string;
    postWorktreeCommand?: string | null;
  }): Promise<Project> => {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (
    id: string,
    data: {
      postWorktreeCommand?: string | null;
      editor?: string | null;
      panes?: Pane[];
    }
  ): Promise<void> => {
    await fetch(`${API_BASE}/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/api/projects/${id}`, { method: "DELETE" });
  },

  getCommit: async (id: string): Promise<CommitInfo | null> => {
    const res = await fetch(`${API_BASE}/api/projects/${id}/commit`);
    if (res.ok) {
      return res.json();
    }
    return null;
  },

  pull: async (id: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    const res = await fetch(`${API_BASE}/api/projects/${id}/pull`, {
      method: "POST",
    });
    return res.json();
  },
};

// Tickets API
export const ticketsApi = {
  getByProject: async (projectId: string): Promise<TicketResponse[]> => {
    const res = await fetch(`${API_BASE}/api/tickets?projectId=${projectId}`);
    return res.json();
  },

  create: async (data: {
    title: string;
    projectId: string;
    description?: string | null;
    runPostCommand?: boolean;
    prLink?: string | null;
  }): Promise<TicketResponse> => {
    const res = await fetch(`${API_BASE}/api/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  createFromBranch: async (data: {
    branchName: string;
    projectId: string;
    description?: string | null;
    runPostCommand?: boolean;
    prLink?: string | null;
  }): Promise<TicketResponse> => {
    const res = await fetch(`${API_BASE}/api/tickets/from-branch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  update: async (
    id: string,
    data: { column?: string; description?: string; prLink?: string }
  ): Promise<void> => {
    await fetch(`${API_BASE}/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/api/tickets/${id}`, { method: "DELETE" });
  },

  clearOverride: async (id: string): Promise<void> => {
    await fetch(`${API_BASE}/api/tickets/${id}/clear-override`, {
      method: "PATCH",
    });
  },

  openEditor: async (id: string): Promise<{ success: boolean; error?: string }> => {
    const res = await fetch(`${API_BASE}/api/tickets/${id}/open-editor`, {
      method: "POST",
    });
    return res.json();
  },
};

// Settings API
export const settingsApi = {
  get: async (key: string): Promise<{ value: string | null }> => {
    const res = await fetch(`${API_BASE}/api/settings/${key}`);
    return res.json();
  },

  set: async (key: string, value: string): Promise<void> => {
    await fetch(`${API_BASE}/api/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
  },
};
