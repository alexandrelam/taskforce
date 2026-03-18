import { useEffect, useState, useCallback, memo, useRef } from "react";
import { useDndContext } from "@dnd-kit/core";
import { useStackConnector } from "@/contexts/StackConnectorContext";
import type { Stack, EdgeHealth } from "@/hooks/useStacks";

interface CardRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface Edge {
  key: string;
  parentId: string;
  childId: string;
  health: EdgeHealth;
}

const HEALTH_COLORS: Record<EdgeHealth, string> = {
  green: "#22c55e",
  amber: "#f59e0b",
  red: "#ef4444",
  blue: "#3b82f6",
};

function buildBezierPath(
  from: CardRect,
  to: CardRect,
  containerRect: { top: number; left: number }
): string {
  const offset = { x: containerRect.left, y: containerRect.top };

  // Determine if cross-column (horizontal) or same-column (vertical)
  const fromCenterX = from.left + from.width / 2 - offset.x;
  const toCenterX = to.left + to.width / 2 - offset.x;
  const horizontalDistance = Math.abs(fromCenterX - toCenterX);

  if (horizontalDistance > from.width * 0.5) {
    // Cross-column: horizontal bezier from parent right to child left
    const goingRight = toCenterX > fromCenterX;
    const startX = goingRight ? from.right - offset.x : from.left - offset.x;
    const startY = from.top + from.height / 2 - offset.y;
    const endX = goingRight ? to.left - offset.x : to.right - offset.x;
    const endY = to.top + to.height / 2 - offset.y;
    const cpOffset = Math.abs(endX - startX) * 0.4;
    const cp1x = startX + (goingRight ? cpOffset : -cpOffset);
    const cp2x = endX + (goingRight ? -cpOffset : cpOffset);
    return `M ${startX} ${startY} C ${cp1x} ${startY}, ${cp2x} ${endY}, ${endX} ${endY}`;
  } else {
    // Same-column: vertical bezier from parent bottom to child top
    const startX = from.left + from.width / 2 - offset.x;
    const startY = from.bottom - offset.y;
    const endX = to.left + to.width / 2 - offset.x;
    const endY = to.top - offset.y;
    const cpOffset = Math.abs(endY - startY) * 0.4;
    return `M ${startX} ${startY} C ${startX} ${startY + cpOffset}, ${endX} ${endY - cpOffset}, ${endX} ${endY}`;
  }
}

interface ConnectorPathProps {
  edge: Edge;
  rects: Map<string, CardRect>;
  containerRect: { top: number; left: number };
  isHighlighted: boolean;
}

const ConnectorPath = memo(function ConnectorPath({
  edge,
  rects,
  containerRect,
  isHighlighted,
}: ConnectorPathProps) {
  const fromRect = rects.get(edge.parentId);
  const toRect = rects.get(edge.childId);

  if (!fromRect || !toRect) return null;

  const d = buildBezierPath(fromRect, toRect, containerRect);
  const color = HEALTH_COLORS[edge.health];
  const markerId = `arrowhead-${edge.key}`;

  return (
    <g>
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 8 3 L 0 6 Z" fill={color} />
        </marker>
      </defs>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? 2.5 : 1.5}
        strokeDasharray="8 4"
        markerEnd={`url(#${markerId})`}
        style={{
          animation: "dash-flow 1s linear infinite",
          filter: isHighlighted ? `drop-shadow(0 0 4px ${color})` : undefined,
          transition: "stroke-width 150ms, filter 150ms",
        }}
      />
    </g>
  );
});

interface StackConnectorsProps {
  stacks: Stack[];
  hoveredStackId: string | null;
  containerRef: React.RefObject<HTMLElement | null>;
}

export function StackConnectors({ stacks, hoveredStackId, containerRef }: StackConnectorsProps) {
  const { active } = useDndContext();
  const { getCardRefs } = useStackConnector();
  const [rects, setRects] = useState<Map<string, CardRect>>(new Map());
  const [containerRect, setContainerRect] = useState({ top: 0, left: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number>(0);

  const updatePositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const cRect = container.getBoundingClientRect();
    setContainerRect({
      top: cRect.top + container.scrollTop,
      left: cRect.left + container.scrollLeft,
    });
    setSize({ width: container.scrollWidth, height: container.scrollHeight });

    const newRects = new Map<string, CardRect>();
    const refs = getCardRefs();

    for (const [ticketId, el] of refs) {
      const r = el.getBoundingClientRect();
      newRects.set(ticketId, {
        top: r.top + container.scrollTop,
        left: r.left + container.scrollLeft,
        right: r.right + container.scrollLeft,
        bottom: r.bottom + container.scrollTop,
        width: r.width,
        height: r.height,
      });
    }

    setRects(newRects);
  }, [containerRef, getCardRefs]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Debounced recalc
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleUpdate = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        rafRef.current = requestAnimationFrame(updatePositions);
      }, 100);
    };

    // Initial
    rafRef.current = requestAnimationFrame(updatePositions);

    // Observe resizes
    const observer = new ResizeObserver(scheduleUpdate);
    observer.observe(container);

    // Scroll
    container.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    // Observe DOM mutations (cards appearing/disappearing)
    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafRef.current);
      observer.disconnect();
      mutationObserver.disconnect();
      container.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [containerRef, updatePositions]);

  // Recompute when stacks change
  useEffect(() => {
    rafRef.current = requestAnimationFrame(updatePositions);
  }, [stacks, updatePositions]);

  // Hide while dragging
  if (active) return null;

  // Collect all edges
  const edges: Edge[] = [];
  for (const stack of stacks) {
    for (const member of stack.members) {
      if (member.parentTicketId) {
        edges.push({
          key: `${member.parentTicketId}-${member.ticketId}`,
          parentId: member.parentTicketId,
          childId: member.ticketId,
          health: member.edgeHealth,
        });
      }
    }
  }

  if (edges.length === 0) return null;

  // Build set of highlighted edges
  const highlightedEdges = new Set<string>();
  if (hoveredStackId) {
    const hoveredStack = stacks.find((s) => s.id === hoveredStackId);
    if (hoveredStack) {
      for (const member of hoveredStack.members) {
        if (member.parentTicketId) {
          highlightedEdges.add(`${member.parentTicketId}-${member.ticketId}`);
        }
      }
    }
  }

  return (
    <>
      <style>{`
        @keyframes dash-flow {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
      <svg
        className="absolute top-0 left-0 pointer-events-none"
        style={{ width: size.width, height: size.height, zIndex: 10 }}
      >
        {edges.map((edge) => (
          <ConnectorPath
            key={edge.key}
            edge={edge}
            rects={rects}
            containerRect={containerRect}
            isHighlighted={highlightedEdges.has(edge.key)}
          />
        ))}
      </svg>
    </>
  );
}
