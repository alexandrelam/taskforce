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
  useWorktrees?: boolean;
}

export interface PrState {
  state: "OPEN" | "CLOSED" | "MERGED";
  mergeable: "MERGEABLE" | "CONFLICTING" | "UNKNOWN";
  reviewDecision: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | "" | null;
  checksStatus: "SUCCESS" | "FAILURE" | "PENDING" | null;
  isDraft: boolean;
  lastCheckedAt: number;
  error?: string;
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
  setupTmuxSession?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
  prLink?: string | null;
  prState?: PrState | null;
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
  setupTmuxSession?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
  prLink?: string | null;
  prState?: string | null;
}
