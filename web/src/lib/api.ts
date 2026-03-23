import type { Project, TicketResponse, CommitInfo, Pane } from "@/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

function toApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const body = isJson ? ((await res.json()) as T | { error?: string }) : await res.text();

  if (!res.ok) {
    const message =
      typeof body === "string"
        ? body
        : body && typeof body === "object" && "error" in body
          ? body.error || `Request failed with status ${res.status}`
          : `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(toApiUrl(path), init);
  return parseResponse<T>(res);
}

function withJsonBody(body: unknown, init: RequestInit = {}): RequestInit {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
  };
}

// Projects API
export const projectsApi = {
  getAll: async (): Promise<Project[]> => {
    return fetchJson<Project[]>("/api/projects");
  },

  create: async (data: {
    name: string;
    path: string;
    postWorktreeCommand?: string | null;
    useWorktrees?: boolean;
  }): Promise<Project> => {
    return fetchJson<Project>("/api/projects", {
      method: "POST",
      ...withJsonBody(data),
    });
  },

  update: async (
    id: string,
    data: {
      postWorktreeCommand?: string | null;
      editor?: string | null;
      panes?: Pane[];
      useWorktrees?: boolean;
    }
  ): Promise<void> => {
    await fetchJson<void>(`/api/projects/${id}`, {
      method: "PATCH",
      ...withJsonBody(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson<void>(`/api/projects/${id}`, { method: "DELETE" });
  },

  getCommit: async (id: string): Promise<CommitInfo | null> => {
    try {
      return await fetchJson<CommitInfo>(`/api/projects/${id}/commit`);
    } catch (error) {
      if (error instanceof ApiError) {
        return null;
      }
      throw error;
    }
  },

  pull: async (id: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    return fetchJson<{ success: boolean; output?: string; error?: string }>(
      `/api/projects/${id}/pull`,
      {
        method: "POST",
      }
    );
  },

  getPrSuggestions: async (
    projectId: string
  ): Promise<Array<{ title: string; url: string; headRefName: string; number: number }>> => {
    try {
      return await fetchJson<
        Array<{ title: string; url: string; headRefName: string; number: number }>
      >(`/api/projects/${projectId}/pr-suggestions`);
    } catch {
      return [];
    }
  },
};

// Tickets API
export const ticketsApi = {
  getByProject: async (projectId: string): Promise<TicketResponse[]> => {
    return fetchJson<TicketResponse[]>(`/api/tickets?projectId=${encodeURIComponent(projectId)}`);
  },

  create: async (data: {
    title: string;
    projectId: string;
    description?: string | null;
    runPostCommand?: boolean;
    prLink?: string | null;
    baseBranch?: string | null;
  }): Promise<TicketResponse> => {
    return fetchJson<TicketResponse>("/api/tickets", {
      method: "POST",
      ...withJsonBody(data),
    });
  },

  createFromBranch: async (data: {
    branchName: string;
    projectId: string;
    description?: string | null;
    runPostCommand?: boolean;
    prLink?: string | null;
  }): Promise<TicketResponse> => {
    return fetchJson<TicketResponse>("/api/tickets/from-branch", {
      method: "POST",
      ...withJsonBody(data),
    });
  },

  update: async (
    id: string,
    data: { column?: string; description?: string | null; prLink?: string | null }
  ): Promise<void> => {
    await fetchJson<void>(`/api/tickets/${id}`, {
      method: "PATCH",
      ...withJsonBody(data),
    });
  },

  delete: async (id: string): Promise<void> => {
    await fetchJson<void>(`/api/tickets/${id}`, { method: "DELETE" });
  },

  clearOverride: async (id: string): Promise<void> => {
    await fetchJson<void>(`/api/tickets/${id}/clear-override`, {
      method: "PATCH",
    });
  },

  openEditor: async (id: string): Promise<{ success: boolean; error?: string }> => {
    return fetchJson<{ success: boolean; error?: string }>(`/api/tickets/${id}/open-editor`, {
      method: "POST",
    });
  },

  getPrInfo: async (url: string): Promise<{ title: string; headRefName: string }> => {
    return fetchJson<{ title: string; headRefName: string }>(
      `/api/tickets/pr-info?url=${encodeURIComponent(url)}`
    );
  },
};

// Settings API
export const settingsApi = {
  get: async (key: string): Promise<{ value: string | null }> => {
    return fetchJson<{ value: string | null }>(`/api/settings/${key}`);
  },

  set: async (key: string, value: string): Promise<void> => {
    await fetchJson<void>(`/api/settings/${key}`, {
      method: "PUT",
      ...withJsonBody({ value }),
    });
  },
};
