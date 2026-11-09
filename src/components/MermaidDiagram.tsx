import React, { useMemo } from 'react';

/**
 * Minimal, dependency-free renderer for the simple `flowchart TD/LR` diagrams
 * the copilot embeds in system-design answers (```mermaid blocks).
 *
 * Parses node/edge lines (`A[Client] --> B[API]`), lays the graph out in
 * layers with a tiny BFS, and draws it as SVG. Anything it cannot parse is
 * shown as a code block instead, so the answer is never worse than plain text.
 */

interface ParsedNode {
  id: string;
  label: string;
}
interface ParsedEdge {
  from: string;
  to: string;
}

const NODE_W = 150;
const NODE_H = 42;
const GAP_X = 34;
const GAP_Y = 58;
const MAX_LABEL = 26;

function parseNode(token: string): ParsedNode | null {
  const t = token.trim();
  const m = t.match(/^([A-Za-z0-9_]+)\s*(?:\[\s*(?:"([^"]*)"|'([^']*)'|([^\]]*))\s*\])?$/);
  if (!m) return null;
  const id = m[1];
  const label = (m[2] ?? m[3] ?? m[4] ?? id).trim() || id;
  return { id, label };
}

function parseFlowchart(src: string): { nodes: Map<string, ParsedNode>; edges: ParsedEdge[] } | null {
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const seen = new Set<string>();

  for (const raw of src.split('\n')) {
    const line = raw.trim().replace(/;$/, '');
    if (!line || /^(flowchart|graph)\b/i.test(line) || /^(%%|classDef|style|linkStyle|subgraph|end)\b/i.test(line)) {
      continue;
    }
    // Edge: A --> B | A --- B | A -.-> B | A ==> B
    const edgeMatch = line.match(/^(.+?)\s*(={2,}>|-{2,}>|-\.->|---|==>)\s*(.+)$/);
    if (edgeMatch) {
      const left = parseNode(edgeMatch[1]);
      const right = parseNode(edgeMatch[3]);
      if (!left || !right) continue;
      nodes.set(left.id, left);
      nodes.set(right.id, right);
      const key = `${left.id}->${right.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ from: left.id, to: right.id });
      }
      continue;
    }
    // Standalone labelled node
    const node = parseNode(line);
    if (node && /\[/.test(line)) nodes.set(node.id, node);
  }

  if (nodes.size < 2 || edges.length === 0) return null;
  return { nodes, edges };
}

/** Layered layout: roots on top, each node one rank below its deepest parent. */
function layout(
  nodes: Map<string, ParsedNode>,
  edges: ParsedEdge[]
): { placed: { node: ParsedNode; x: number; y: number }[]; width: number; height: number } {
  const incoming = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const id of nodes.keys()) incoming.set(id, 0);
  for (const e of edges) {
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    children.set(e.from, [...(children.get(e.from) || []), e.to]);
  }

  const rank = new Map<string, number>();
  const queue = [...nodes.keys()].filter((id) => (incoming.get(id) || 0) === 0);
  if (queue.length === 0) queue.push([...nodes.keys()][0]);
  queue.forEach((id) => rank.set(id, 0));

  // Relax ranks a bounded number of times (handles minor cycles gracefully).
  for (let pass = 0; pass < nodes.size; pass++) {
    let changed = false;
    for (const e of edges) {
      const r = (rank.get(e.from) ?? 0) + 1;
      if (r > (rank.get(e.to) ?? 0)) {
        rank.set(e.to, r);
        changed = true;
      }
    }
    if (!changed) break;
  }
  for (const id of nodes.keys()) if (!rank.has(id)) rank.set(id, 0);

  const byRank = new Map<number, string[]>();
  for (const [id, r] of rank) byRank.set(r, [...(byRank.get(r) || []), id]);

  const placed: { node: ParsedNode; x: number; y: number }[] = [];
  let maxCols = 1;
  const sortedRanks = [...byRank.keys()].sort((a, b) => a - b);
  for (const r of sortedRanks) {
    const ids = byRank.get(r)!;
    maxCols = Math.max(maxCols, ids.length);
    ids.forEach((id, i) => {
      placed.push({
        node: nodes.get(id)!,
        x: i * (NODE_W + GAP_X),
        y: r * (NODE_H + GAP_Y),
      });
    });
  }

  return {
    placed,
    width: maxCols * (NODE_W + GAP_X) - GAP_X + 4,
    height: (sortedRanks.length || 1) * (NODE_H + GAP_Y) - GAP_Y + 4,
  };
}

const truncate = (s: string, n = MAX_LABEL) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export const MermaidDiagram: React.FC<{ code: string }> = ({ code }) => {
  const parsed = useMemo(() => parseFlowchart(code), [code]);
  const laid = useMemo(() => (parsed ? layout(parsed.nodes, parsed.edges) : null), [parsed]);

  if (!parsed || !laid) {
    // Not a simple flowchart: show the source so nothing is lost.
    return (
      <pre className="my-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] font-mono text-cyan-200/90">
        {code.trim()}
      </pre>
    );
  }

  const pos = new Map(laid.placed.map((p) => [p.node.id, p]));

  return (
    <div className="my-3 rounded-2xl border border-emerald-500/25 bg-slate-950/80 p-3 space-y-2">
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
        System Design Diagram
      </span>
      <div className="overflow-x-auto">
        <svg
          width={laid.width}
          height={laid.height}
          viewBox={`0 0 ${laid.width} ${laid.height}`}
          role="img"
          aria-label="System design diagram"
          className="min-w-full"
        >
          <defs>
            <marker id="md-arrow" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
              <path d="M0,0 L0,6.4 L8,3.2 z" fill="#34d399" />
            </marker>
          </defs>

          {parsed.edges.map((e, i) => {
            const a = pos.get(e.from);
            const b = pos.get(e.to);
            if (!a || !b) return null;
            const x1 = a.x + NODE_W / 2;
            const y1 = a.y + NODE_H;
            const x2 = b.x + NODE_W / 2;
            const y2 = b.y;
            // Vertical (or slightly diagonal) connector between layers.
            const midY = (y1 + y2) / 2;
            const d =
              Math.abs(x1 - x2) < 2
                ? `M ${x1} ${y1} L ${x2} ${y2}`
                : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="#34d399"
                strokeOpacity={0.55}
                strokeWidth={1.6}
                markerEnd="url(#md-arrow)"
              />
            );
          })}

          {laid.placed.map((p) => (
            <g key={p.node.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="#0f172a"
                stroke="#34d399"
                strokeOpacity={0.5}
              />
              <text
                x={p.x + NODE_W / 2}
                y={p.y + NODE_H / 2 + 4}
                textAnchor="middle"
                fontSize={11}
                fill="#e2e8f0"
                fontWeight={600}
              >
                {truncate(p.node.label)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

/** Split answer text on ```mermaid fences, rendering diagrams inline. */
export const AnswerBody: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const parts = String(text || '').split(/```mermaid([\s\S]*?)```/g);
  return (
    <div className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <MermaidDiagram key={i} code={part} />
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </div>
  );
};
