import { useMemo } from "react";
import type { Task, Columns } from "@/types";

export type EdgeHealth = "green" | "amber" | "red" | "blue";

export interface StackMember {
  ticketId: string;
  parentTicketId: string | null;
  position: number;
  total: number;
  edgeHealth: EdgeHealth;
  needsResync: boolean;
}

export interface Stack {
  id: string; // root ticket ID
  members: StackMember[];
}

export interface StackData {
  stacks: Stack[];
  stackByTicketId: Map<string, Stack>;
  memberByTicketId: Map<string, StackMember>;
}

function computeEdgeHealth(
  childTask: Task,
  parentTask: Task
): { health: EdgeHealth; needsResync: boolean } {
  const childPr = childTask.prState;
  const parentPr = parentTask.prState;

  if (!childPr || !parentPr) return { health: "blue", needsResync: false };

  // Red: child has merge conflicts
  if (childPr.mergeable === "CONFLICTING") {
    return { health: "red", needsResync: true };
  }

  // Amber: parent PR is merged (stack needs resync)
  if (parentPr.state === "MERGED") {
    return { health: "amber", needsResync: true };
  }

  // Green: everything clean (CONFLICTING already handled above)
  if (childPr.state === "OPEN" && parentPr.state === "OPEN") {
    return { health: "green", needsResync: false };
  }

  return { health: "blue", needsResync: false };
}

export function useStacks(columns: Columns): StackData {
  return useMemo(() => {
    const allTasks: Task[] = Object.values(columns).flat();

    // Build map: headRefName -> task for all tickets with PR data
    const headRefToTask = new Map<string, Task>();
    for (const task of allTasks) {
      const head = task.prState?.headRefName;
      if (head) {
        headRefToTask.set(head, task);
      }
    }

    // Build parent-child relationships
    // child's baseRefName === parent's headRefName
    const parentOf = new Map<string, string>(); // childId -> parentId
    const childrenOf = new Map<string, string[]>(); // parentId -> childIds

    for (const task of allTasks) {
      const base = task.prState?.baseRefName;
      if (!base) continue;

      const parentTask = headRefToTask.get(base);
      if (!parentTask || parentTask.id === task.id) continue;

      parentOf.set(task.id, parentTask.id);
      const existing = childrenOf.get(parentTask.id) || [];
      existing.push(task.id);
      childrenOf.set(parentTask.id, existing);
    }

    // Find root nodes (have children but no parent in the map)
    const roots = new Set<string>();
    for (const parentId of childrenOf.keys()) {
      if (!parentOf.has(parentId)) {
        roots.add(parentId);
      }
    }
    // Also add nodes that have a parent but whose parent has children
    // (handles chains where middle nodes are roots of sub-chains)

    // Build chains from roots
    const taskById = new Map<string, Task>();
    for (const task of allTasks) {
      taskById.set(task.id, task);
    }

    const stacks: Stack[] = [];
    const stackByTicketId = new Map<string, Stack>();
    const memberByTicketId = new Map<string, StackMember>();

    for (const rootId of roots) {
      // Walk the chain from root
      const chain: string[] = [];
      const visited = new Set<string>();

      const walk = (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);
        chain.push(id);
        const children = childrenOf.get(id) || [];
        for (const childId of children) {
          walk(childId);
        }
      };

      walk(rootId);

      // Only create stack if 2+ members
      if (chain.length < 2) continue;

      const members: StackMember[] = chain.map((ticketId, idx) => {
        const parentTicketId = parentOf.get(ticketId) || null;
        const task = taskById.get(ticketId)!;
        const parentTask = parentTicketId ? taskById.get(parentTicketId) : null;

        const { health, needsResync } =
          parentTask && task
            ? computeEdgeHealth(task, parentTask)
            : { health: "blue" as EdgeHealth, needsResync: false };

        return {
          ticketId,
          parentTicketId,
          position: idx + 1,
          total: chain.length,
          edgeHealth: health,
          needsResync,
        };
      });

      const stack: Stack = { id: rootId, members };
      stacks.push(stack);

      for (const member of members) {
        stackByTicketId.set(member.ticketId, stack);
        memberByTicketId.set(member.ticketId, member);
      }
    }

    return { stacks, stackByTicketId, memberByTicketId };
  }, [columns]);
}
