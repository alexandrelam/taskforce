import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import fs from "fs";
import os from "os";
import path from "path";
import { execSync } from "child_process";

interface SeedProject {
  id: string;
  name: string;
  path: string;
  createdAt?: number;
  postWorktreeCommand?: string | null;
  panes?: Array<{ name: string }>;
  editor?: string | null;
  useWorktrees?: boolean;
}

interface SeedTicket {
  id: string;
  title: string;
  column?: string;
  createdAt?: number;
  projectId?: string | null;
  worktreePath?: string | null;
  isMain?: boolean | null;
  setupStatus?: string;
  setupError?: string | null;
  setupLogs?: string | null;
  setupTmuxSession?: string | null;
  description?: string | null;
  statusOverride?: boolean | null;
  prLink?: string | null;
  prState?: string | null;
}

export async function resetAppState(
  request: APIRequestContext,
  data: {
    settings?: Record<string, string>;
    projects?: SeedProject[];
    tickets?: SeedTicket[];
  } = {}
) {
  const response = await request.post("http://127.0.0.1:3325/api/e2e/reset", {
    data: {
      settings: data.settings ?? {},
      projects: data.projects ?? [],
      tickets: data.tickets ?? [],
    },
  });

  expect(response.ok()).toBeTruthy();
}

export function createGitRepo(name: string, commitMessage: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "taskforce-e2e-"));
  const repoPath = path.join(root, name);

  fs.mkdirSync(repoPath, { recursive: true });
  execSync("git init -b main", { cwd: repoPath, stdio: "ignore" });
  execSync('git config user.email "e2e@example.com"', { cwd: repoPath, stdio: "ignore" });
  execSync('git config user.name "Taskforce E2E"', { cwd: repoPath, stdio: "ignore" });
  fs.writeFileSync(path.join(repoPath, "README.md"), `# ${name}\n`);
  execSync("git add README.md", { cwd: repoPath, stdio: "ignore" });
  execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, {
    cwd: repoPath,
    stdio: "ignore",
  });
  execSync("git checkout -b feature/existing-branch", { cwd: repoPath, stdio: "ignore" });
  execSync("git checkout main", { cwd: repoPath, stdio: "ignore" });

  const hash = execSync("git log -1 --format=%h", { cwd: repoPath, encoding: "utf-8" }).trim();

  return { path: repoPath, hash };
}

export function makeProject(overrides: Partial<SeedProject> = {}): SeedProject {
  const repo = createGitRepo(overrides.name ?? "project", "Initial test commit");
  return {
    id: overrides.id ?? "project-1",
    name: overrides.name ?? "Alpha",
    path: overrides.path ?? repo.path,
    createdAt: overrides.createdAt ?? Date.now(),
    panes: overrides.panes ?? [],
    editor: overrides.editor ?? null,
    postWorktreeCommand: overrides.postWorktreeCommand ?? null,
    useWorktrees: overrides.useWorktrees ?? false,
  };
}

export function makeMainTicket(projectId: string, overrides: Partial<SeedTicket> = {}): SeedTicket {
  return {
    id: overrides.id ?? `${projectId}-main`,
    title: overrides.title ?? "main",
    column: overrides.column ?? "To Do",
    createdAt: overrides.createdAt ?? Date.now(),
    projectId,
    isMain: overrides.isMain ?? true,
    setupStatus: overrides.setupStatus ?? "ready",
    worktreePath: overrides.worktreePath ?? null,
    description: overrides.description ?? null,
    setupError: overrides.setupError ?? null,
    setupLogs: overrides.setupLogs ?? null,
    setupTmuxSession: overrides.setupTmuxSession ?? null,
    statusOverride: overrides.statusOverride ?? null,
    prLink: overrides.prLink ?? null,
    prState: overrides.prState ?? null,
  };
}

export function makeTicket(projectId: string, overrides: Partial<SeedTicket> = {}): SeedTicket {
  return {
    id: overrides.id ?? `${projectId}-ticket-${Math.random().toString(36).slice(2, 8)}`,
    title: overrides.title ?? "Feature Ticket",
    column: overrides.column ?? "To Do",
    createdAt: overrides.createdAt ?? Date.now(),
    projectId,
    isMain: overrides.isMain ?? false,
    setupStatus: overrides.setupStatus ?? "ready",
    worktreePath: overrides.worktreePath ?? null,
    description: overrides.description ?? null,
    setupError: overrides.setupError ?? null,
    setupLogs: overrides.setupLogs ?? null,
    setupTmuxSession: overrides.setupTmuxSession ?? null,
    statusOverride: overrides.statusOverride ?? null,
    prLink: overrides.prLink ?? null,
    prState: overrides.prState ?? null,
  };
}

export async function gotoApp(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "Taskforce" })).toBeVisible();
}

export async function openProjectSelector(page: Page) {
  await page.getByTestId("project-selector-trigger").click();
}

export async function selectProject(page: Page, projectId: string) {
  const option = page.getByTestId(`project-option-${projectId}`);
  if (!(await option.isVisible().catch(() => false))) {
    await openProjectSelector(page);
  }
  await option.click();
}

export async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Open Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

export function projectBoard(page: Page, projectId: string): Locator {
  return page.getByTestId(`project-board-${projectId}`);
}

export function projectCard(page: Page, projectId: string): Locator {
  return page.getByTestId(`project-card-${projectId}`);
}

function columnTestId(projectId: string, columnName: string) {
  return `column-${projectId}-${columnName.toLowerCase().replace(/\s+/g, "-")}`;
}

export function column(page: Page, projectId: string, columnName: string): Locator {
  return page.getByTestId(columnTestId(projectId, columnName));
}

export async function dragTicket(
  page: Page,
  ticketId: string,
  projectId: string,
  columnName: string
) {
  await page
    .getByTestId(`ticket-card-${ticketId}`)
    .dragTo(column(page, projectId, columnName), { targetPosition: { x: 120, y: 120 } });
}
