import { expect, test } from "@playwright/test";
import {
  column,
  gotoApp,
  makeMainTicket,
  makeProject,
  makeTicket,
  openProjectSelector,
  openSettings,
  projectBoard,
  projectCard,
  resetAppState,
  selectProject,
} from "./helpers";

test.beforeEach(async ({ request }) => {
  await resetAppState(request);
});

test("loads the empty state and header controls", async ({ page }) => {
  await gotoApp(page);

  await expect(page.getByTestId("project-selector-trigger")).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle theme" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Settings" })).toBeVisible();
  await expect(page.getByText("No projects selected")).toBeVisible();
  await expect(page.getByText("Select up to 3 projects from the dropdown above")).toBeVisible();
});

test("restores stored project selection and cleans invalid saved ids", async ({
  page,
  request,
}) => {
  const project = makeProject({ id: "alpha", name: "Alpha" });
  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify(["missing", "alpha"]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id)],
  });

  await gotoApp(page);

  await expect(projectBoard(page, project.id)).toBeVisible();
  await expect(page.getByTestId("project-selector-trigger")).toContainText("Alpha");

  const settingsResponse = await request.get(
    "http://127.0.0.1:3325/api/settings/selected_projects"
  );
  const settingsJson = (await settingsResponse.json()) as { value: string | null };
  expect(settingsJson.value).toBe('["alpha"]');
});

test("selects and unselects projects and enforces the three-project limit", async ({
  page,
  request,
}) => {
  const projects = [
    makeProject({ id: "alpha", name: "Alpha" }),
    makeProject({ id: "beta", name: "Beta" }),
    makeProject({ id: "gamma", name: "Gamma" }),
    makeProject({ id: "delta", name: "Delta" }),
  ];

  await resetAppState(request, {
    projects,
    tickets: projects.map((project) => makeMainTicket(project.id)),
  });

  await gotoApp(page);

  await selectProject(page, "alpha");
  await expect(projectBoard(page, "alpha")).toBeVisible();
  await expect(page.getByTestId("project-selector-trigger")).toContainText("Alpha");

  await page.getByTestId("project-option-alpha").click();
  await expect(page.getByText("No projects selected")).toBeVisible();

  await page.mouse.click(10, 10);
  await selectProject(page, "alpha");
  await selectProject(page, "beta");
  await selectProject(page, "gamma");
  await expect(projectBoard(page, "alpha")).toBeVisible();
  await expect(projectBoard(page, "beta")).toBeVisible();
  await expect(projectBoard(page, "gamma")).toBeVisible();

  await page.getByTestId("project-option-delta").click();
  await expect(page.getByText("Maximum 3 projects can be selected")).toBeVisible();
  await expect(projectBoard(page, "delta")).toHaveCount(0);
});

test("opens settings, switches sections, and persists the PR polling interval", async ({
  page,
  request,
}) => {
  await gotoApp(page);
  await openSettings(page);

  const intervalInput = page.locator("#pr-poll-interval");
  await expect(intervalInput).toBeVisible();
  await expect(intervalInput).toHaveValue("2");

  await page.getByRole("button", { name: "Projects" }).click();
  await expect(page.getByText("Existing Projects")).toBeVisible();
  await page.getByRole("button", { name: "General" }).click();

  await intervalInput.fill("0.25");
  await intervalInput.blur();
  await expect(intervalInput).toHaveValue("0.5");

  await page.keyboard.press("Escape");
  await page.reload();
  await openSettings(page);
  await expect(page.locator("#pr-poll-interval")).toHaveValue("0.5");

  const response = await request.get("http://127.0.0.1:3325/api/settings/prPollInterval");
  const body = (await response.json()) as { value: string | null };
  expect(body.value).toBe("30000");
});

test("creates, updates, and deletes a project from settings", async ({ page, request }) => {
  await gotoApp(page);
  await openSettings(page);
  await page.getByRole("button", { name: "Projects" }).click();

  await page.getByLabel("Project name").fill("Delta");
  await page.getByLabel("Project path").fill("/tmp/taskforce-e2e-project");
  await page.getByLabel("Post-worktree command").fill("pnpm install");
  await page.getByRole("button", { name: "Create Project" }).click();

  await expect(page.getByText("Delta")).toBeVisible();
  const projectsResponse = await request.get("http://127.0.0.1:3325/api/projects");
  const projectsJson = (await projectsResponse.json()) as Array<{ id: string; name: string }>;
  const createdProject = projectsJson.find((project) => project.name === "Delta");
  expect(createdProject).toBeTruthy();
  await page.keyboard.press("Escape");

  await openProjectSelector(page);
  await page.getByRole("button", { name: "Delta" }).click();
  await expect(page.getByRole("heading", { name: "Delta" })).toBeVisible();
  await expect(
    page.locator('[data-testid^="ticket-card-"]').filter({ hasText: "main" })
  ).toBeVisible();

  await openSettings(page);
  await page.getByRole("button", { name: "Projects" }).click();
  const deltaCard = projectCard(page, createdProject!.id);
  await deltaCard.getByLabel(/Post-worktree command/).fill("pnpm dev");
  await deltaCard.getByLabel(/Post-worktree command/).blur();
  await deltaCard.getByRole("switch").click();
  await deltaCard.getByRole("combobox").click();
  await page.getByRole("option", { name: "VS Code" }).click();
  await deltaCard.getByLabel(/New pane name/).fill("server");
  await deltaCard.getByRole("button", { name: /Add pane/ }).click();
  await page.keyboard.press("Escape");

  await page.locator('[data-testid^="ticket-card-"]').filter({ hasText: "main" }).click();
  await expect(page.getByTestId("terminal-tab-server")).toBeVisible();
  await page.getByRole("button", { name: "Close Terminal Panel" }).click();

  await openSettings(page);
  await page.getByRole("button", { name: "Projects" }).click();
  const persistedCard = projectCard(page, createdProject!.id);
  await expect(persistedCard.getByLabel(/Post-worktree command/)).toHaveValue("pnpm dev");
  await expect(persistedCard.getByRole("switch")).toHaveAttribute("aria-checked", "false");
  await expect(persistedCard.getByRole("combobox")).toContainText("VS Code");
  await persistedCard.getByRole("button", { name: "Remove pane server" }).click();
  await persistedCard.getByRole("button", { name: /Delete project Delta/ }).click();
  await expect(page.getByText("Delta")).toHaveCount(0);
});

test("renders git commit info and the board action menu", async ({ page, request }) => {
  const project = makeProject({ id: "alpha", name: "Alpha" });
  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id)],
  });

  await gotoApp(page);

  await expect(projectBoard(page, project.id)).toContainText("Alpha");
  await expect(projectBoard(page, project.id)).toContainText("Initial test commit");
  await expect(projectBoard(page, project.id).locator(".font-mono")).toContainText(/[0-9a-f]{7}/);

  await page.getByRole("button", { name: "Open Alpha board menu" }).click();
  await expect(page.getByText("Pull")).toBeVisible();
  await expect(page.getByText("Add Ticket")).toBeVisible();
  await expect(page.getByText("Open Branch")).toBeVisible();
});

test("creates tickets manually, from branch metadata, edits them, and deletes them", async ({
  page,
  request,
}) => {
  const project = makeProject({ id: "alpha", name: "Alpha", useWorktrees: false });
  const mainTicket = makeMainTicket(project.id);

  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [mainTicket],
  });

  await gotoApp(page);

  await page.getByRole("button", { name: "Open Alpha board menu" }).click();
  await page.getByText("Add Ticket").click();
  await expect(page.getByRole("button", { name: "Create" })).toBeDisabled();
  await page.getByPlaceholder("Ticket title").fill("Ship dashboard");
  await page.getByPlaceholder("Description (optional)").fill("Build the new dashboard");
  await expect(page.getByRole("button", { name: "Create" })).toBeEnabled();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(column(page, project.id, "To Do")).toContainText("Ship dashboard");

  await page.route("**/api/tickets/pr-info?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        title: "Polish release flow",
        headRefName: "release/polish-flow",
      }),
    });
  });

  await page.getByRole("button", { name: "Open Alpha board menu" }).click();
  await page.getByText("Add Ticket").click();
  await page
    .getByPlaceholder("PR link (optional, e.g., https://github.com/...)")
    .evaluate((input, url) => {
      const element = input as HTMLInputElement;
      element.value = url;
      element.dispatchEvent(new Event("input", { bubbles: true }));
      const data = new DataTransfer();
      data.setData("text/plain", url);
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: data }));
    }, "https://github.com/openai/taskforce/pull/12");
  await expect(page.getByPlaceholder("Ticket title")).toHaveValue("Polish release flow");
  await expect(
    page.getByPlaceholder("Base branch (optional, defaults to current branch)")
  ).toHaveValue("release/polish-flow");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(column(page, project.id, "To Do")).toContainText("Polish release flow");
  await page.unroute("**/api/tickets/pr-info?*");

  await page.getByRole("button", { name: "Open Alpha board menu" }).click();
  await page.getByText("Open Branch").click();
  await expect(page.getByRole("button", { name: "Open Branch" })).toBeDisabled();
  await page
    .getByPlaceholder("Branch name (e.g., feature-x or origin/feature-x)")
    .fill("hotfix/login");
  await page.getByPlaceholder("Description (optional)").fill("Hotfix branch");
  await page.getByRole("button", { name: "Open Branch" }).click();
  await expect(column(page, project.id, "To Do")).toContainText("hotfix/login");

  const createdTicketCard = column(page, project.id, "To Do")
    .locator('[data-testid^="ticket-card-"]')
    .filter({ hasText: "Ship dashboard" });
  await createdTicketCard.hover();
  await createdTicketCard.getByRole("button", { name: "Edit Ship dashboard" }).click();
  await page.getByPlaceholder("Description (optional)").fill("Updated description");
  await page
    .getByPlaceholder("PR link (optional, e.g., https://github.com/...)")
    .fill("github.com/invalid");
  page.once("dialog", (dialog) => {
    expect(dialog.message()).toContain("PR link must be a valid URL");
    void dialog.accept();
  });
  await page.getByRole("button", { name: "Update" }).click();
  await page
    .getByPlaceholder("PR link (optional, e.g., https://github.com/...)")
    .fill("https://github.com/openai/taskforce/pull/99");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(column(page, project.id, "To Do")).toContainText("Updated description");

  const branchCard = column(page, project.id, "To Do")
    .locator('[data-testid^="ticket-card-"]')
    .filter({ hasText: "hotfix/login" });
  await branchCard.hover();
  await branchCard.getByRole("button", { name: "Delete hotfix/login" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(column(page, project.id, "To Do")).not.toContainText("hotfix/login");
  await expect(page.getByRole("button", { name: "Delete main" })).toHaveCount(0);
});

test("moves tickets between columns and clears the manual override", async ({ page, request }) => {
  const project = makeProject({ id: "alpha", name: "Alpha" });
  const ticket = makeTicket(project.id, { id: "ticket-1", title: "Move me" });

  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id), ticket],
  });

  await gotoApp(page);

  await request.patch(`http://127.0.0.1:3325/api/tickets/${ticket.id}`, {
    data: { column: "In Progress" },
  });
  await page.reload();
  const movedTicketCard = page.getByTestId(`ticket-card-${ticket.id}`);
  await expect(column(page, project.id, "In Progress")).toContainText("Move me");
  await expect(
    movedTicketCard.getByRole("button", { name: "Clear manual status override for Move me" })
  ).toBeVisible();

  await request.patch(`http://127.0.0.1:3325/api/tickets/${ticket.id}`, {
    data: { column: "Done" },
  });
  await page.reload();
  await expect(column(page, project.id, "Done")).toContainText("Move me");

  await page
    .getByTestId(`ticket-card-${ticket.id}`)
    .getByRole("button", { name: "Clear manual status override for Move me" })
    .click();
  await expect(page.getByText("Override cleared")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Clear manual status override for Move me" })
  ).toHaveCount(0);
});

test("opens and closes the terminal panel, switches panes, and shows setup failure state", async ({
  page,
  request,
}) => {
  const project = makeProject({
    id: "alpha",
    name: "Alpha",
    panes: [{ name: "server" }],
  });
  const readyTicket = makeTicket(project.id, {
    id: "ticket-ready",
    title: "Ready ticket",
    worktreePath: project.path,
  });
  const setupTicket = makeTicket(project.id, {
    id: "ticket-setup",
    title: "Setup ticket",
    setupStatus: "running_post_command",
    setupTmuxSession: "ticket-setup-session",
    setupLogs: "Installing dependencies...",
  });
  const failedTicket = makeTicket(project.id, {
    id: "ticket-failed",
    title: "Failed ticket",
    setupStatus: "failed",
    setupTmuxSession: "ticket-failed-session",
    setupLogs: "npm ERR! failed",
    setupError: "Setup exploded",
  });

  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id), readyTicket, setupTicket, failedTicket],
  });

  await gotoApp(page);

  await page.getByText("Ready ticket").click();
  await expect(page.getByTestId("terminal-panel")).toBeVisible();
  await expect(
    page.getByTestId("terminal-panel").getByText("Terminal", { exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("terminal-tab-claude")).toHaveClass(/border-primary/);
  await page.getByTestId("terminal-tab-server").click();
  await expect(page.getByTestId("terminal-tab-server")).toHaveClass(/border-primary/);
  await page.getByRole("button", { name: "Close Terminal Panel" }).click();
  await expect(page.getByTestId("terminal-panel")).toHaveCount(0);

  await page.getByText("Setup ticket").click();
  await expect(
    page.getByTestId("terminal-panel").getByText("Setting Up", { exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("terminal-tab-setup")).toHaveClass(/border-primary/);

  await page.getByText("Failed ticket").click();
  await expect(
    page.getByTestId("terminal-panel").getByText("Setup Failed", { exact: true })
  ).toBeVisible();
  await expect(page.getByTestId("terminal-tab-setup")).toBeVisible();
});

test("opens PR links in a new tab, shows editor toasts, renders PR badges, and supports PR suggestions", async ({
  page,
  request,
}) => {
  const project = makeProject({
    id: "alpha",
    name: "Alpha",
    editor: "vscode",
  });
  const ticket = makeTicket(project.id, {
    id: "ticket-pr",
    title: "PR ticket",
    prLink: "https://github.com/openai/taskforce/pull/42",
    prState: JSON.stringify({
      state: "OPEN",
      mergeable: "MERGEABLE",
      reviewDecision: "APPROVED",
      checksStatus: "SUCCESS",
      isDraft: false,
      lastCheckedAt: Date.now(),
    }),
    worktreePath: project.path,
  });

  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id), ticket],
  });

  await page.route("**/api/projects/alpha/pr-suggestions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          title: "Suggested PR",
          url: "https://github.com/openai/taskforce/pull/77",
          headRefName: "feature/suggested-pr",
          number: 77,
        },
      ]),
    });
  });

  let openEditorCalls = 0;
  await page.route("**/api/tickets/ticket-pr/open-editor", async (route) => {
    openEditorCalls += 1;
    await route.fulfill({
      status: openEditorCalls === 1 ? 200 : 500,
      contentType: "application/json",
      body: JSON.stringify(
        openEditorCalls === 1
          ? { success: true }
          : { success: false, error: "Editor command missing" }
      ),
    });
  });

  await gotoApp(page);
  await expect(page.getByText("Approved")).toBeVisible();
  await expect(page.getByText("Checks passing")).toBeVisible();
  await expect(page.getByTestId("pr-suggestion-77")).toBeVisible();
  await page.getByTestId("pr-suggestion-77").click();
  await expect(column(page, project.id, "To Do")).toContainText("Suggested PR");

  const prCard = column(page, project.id, "To Do")
    .locator('[data-testid^="ticket-card-"]')
    .filter({ hasText: "PR ticket" });
  await prCard.hover();
  const popupPromise = page.waitForEvent("popup");
  await prCard.getByRole("button", { name: "Open PR for PR ticket" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://github.com/openai/taskforce/pull/42");
  await expect(page.getByTestId("terminal-panel")).toHaveCount(0);

  await prCard.getByRole("button", { name: "Open PR ticket in editor" }).click();
  await expect(page.getByText("Editor opened")).toBeVisible();
  await prCard.getByRole("button", { name: "Open PR ticket in editor" }).click();
  await expect(page.getByText("Failed to open editor")).toBeVisible();
  await expect(page.getByText("Editor command missing")).toBeVisible();
});

test("clicking outside closes the project dropdown and terminal panel", async ({
  page,
  request,
}) => {
  const project = makeProject({ id: "alpha", name: "Alpha" });
  const ticket = makeTicket(project.id, {
    id: "ticket-1",
    title: "Outside click",
    worktreePath: project.path,
  });

  await resetAppState(request, {
    settings: {
      selected_projects: JSON.stringify([project.id]),
    },
    projects: [project],
    tickets: [makeMainTicket(project.id), ticket],
  });

  await gotoApp(page);

  await openProjectSelector(page);
  await expect(page.getByText("Select up to 3 projects")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByText("Select up to 3 projects")).toHaveCount(0);

  await page.getByText("Outside click").click();
  await expect(page.getByTestId("terminal-panel")).toBeVisible();
  await page.mouse.click(10, 10);
  await expect(page.getByTestId("terminal-panel")).toHaveCount(0);
});
