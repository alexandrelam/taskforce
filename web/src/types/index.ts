import type { UniqueIdentifier } from "@dnd-kit/core";

export interface Pane {
  name: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  createdAt: number;
  panes: Pane[];
  editor: string | null;
  postWorktreeCommand?: string | null;
}

export type SetupStatus =
  | "pending"
  | "creating_worktree"
  | "running_post_command"
  | "ready"
  | "failed";

export interface Task {
  id: string;
  title: string;
  worktreePath?: string | null;
  isMain?: boolean | null;
  setupStatus?: SetupStatus;
  setupError?: string | null;
  setupLogs?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
}

export interface CommitInfo {
  hash: string;
  message: string;
}

export type Columns = Record<UniqueIdentifier, Task[]>;

export interface TicketResponse {
  id: string;
  title: string;
  column: string;
  worktreePath?: string | null;
  isMain?: boolean | null;
  setupStatus?: SetupStatus;
  setupError?: string | null;
  setupLogs?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
}
