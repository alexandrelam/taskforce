import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { tickets } from "../db/schema.js";
import {
  captureTmuxOutput,
  createWorktree,
  createWorktreeFromBranch,
  getTmuxSessionStatus,
  isTmuxAvailable,
  killSetupTmuxSession,
  runPostWorktreeCommand,
  slugify,
  spawnTmuxCommand,
} from "../worktree.js";

export type WorktreeCreator = () => { worktreePath: string | null; error: string | null };
interface SetupPlan {
  create: WorktreeCreator;
}

const SETUP_POLL_INTERVAL = 2000;
const SETUP_MAX_DURATION = 600000;

export function createTicketWorktree(
  projectPath: string,
  title: string,
  baseBranch?: string
): SetupPlan {
  const slug = slugify(title);
  return {
    create: () => createWorktree(projectPath, slug, baseBranch),
  };
}

export function createBranchWorktree(projectPath: string, branchName: string): SetupPlan {
  return {
    create: () => createWorktreeFromBranch(projectPath, branchName),
  };
}

function monitorSetupSession(ticketId: string, sessionName: string): void {
  const startTime = Date.now();

  const checkStatus = async () => {
    if (Date.now() - startTime > SETUP_MAX_DURATION) {
      const output = captureTmuxOutput(sessionName);
      await db
        .update(tickets)
        .set({
          setupStatus: "failed",
          setupError: "Setup timed out after 10 minutes",
          setupLogs: output,
        })
        .where(eq(tickets.id, ticketId));
      return;
    }

    const status = getTmuxSessionStatus(sessionName);

    if (!status.running) {
      const output = captureTmuxOutput(sessionName);

      if (status.exitCode === 0) {
        await db
          .update(tickets)
          .set({
            setupStatus: "ready",
            setupLogs: output,
            setupTmuxSession: null,
          })
          .where(eq(tickets.id, ticketId));
        killSetupTmuxSession(sessionName);
      } else {
        await db
          .update(tickets)
          .set({
            setupStatus: "failed",
            setupError: `Command exited with code ${status.exitCode}`,
            setupLogs: output,
          })
          .where(eq(tickets.id, ticketId));
      }
      return;
    }

    setTimeout(checkStatus, SETUP_POLL_INTERVAL);
  };

  setTimeout(checkStatus, SETUP_POLL_INTERVAL);
}

async function runPostCommandSync(
  ticketId: string,
  worktreePath: string,
  command: string
): Promise<void> {
  await db
    .update(tickets)
    .set({ setupStatus: "running_post_command" })
    .where(eq(tickets.id, ticketId));

  const result = runPostWorktreeCommand(worktreePath, command);

  if (result.error) {
    await db
      .update(tickets)
      .set({
        setupStatus: "failed",
        setupError: result.error,
        setupLogs: result.output,
      })
      .where(eq(tickets.id, ticketId));
    return;
  }

  await db
    .update(tickets)
    .set({
      setupStatus: "ready",
      setupLogs: result.output,
    })
    .where(eq(tickets.id, ticketId));
}

export async function runTicketSetup(
  ticketId: string,
  createWorktreeFn: WorktreeCreator,
  postWorktreeCommand: string | null
) {
  try {
    await db
      .update(tickets)
      .set({ setupStatus: "creating_worktree" })
      .where(eq(tickets.id, ticketId));

    const result = createWorktreeFn();

    if (result.error) {
      await db
        .update(tickets)
        .set({
          setupStatus: "failed",
          setupError: result.error,
        })
        .where(eq(tickets.id, ticketId));
      return;
    }

    await db
      .update(tickets)
      .set({ worktreePath: result.worktreePath })
      .where(eq(tickets.id, ticketId));

    if (result.worktreePath && postWorktreeCommand) {
      const sessionName = `${ticketId}-setup`;

      if (isTmuxAvailable()) {
        const spawnResult = spawnTmuxCommand(sessionName, result.worktreePath, postWorktreeCommand);

        if (spawnResult.error) {
          await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
          return;
        }

        await db
          .update(tickets)
          .set({
            setupStatus: "running_post_command",
            setupTmuxSession: sessionName,
          })
          .where(eq(tickets.id, ticketId));

        monitorSetupSession(ticketId, sessionName);
      } else {
        await runPostCommandSync(ticketId, result.worktreePath, postWorktreeCommand);
      }
      return;
    }

    await db.update(tickets).set({ setupStatus: "ready" }).where(eq(tickets.id, ticketId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(tickets)
      .set({
        setupStatus: "failed",
        setupError: message,
      })
      .where(eq(tickets.id, ticketId));
  }
}
