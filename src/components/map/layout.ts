import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import type { Department } from "@/data/types";

export const HUB_RADIUS = 300;
export const OUTER_RADIUS = 480;
export const CORE_SIZE = 38;
export const HUB_SIZE = 30;
export const AGENT_SIZE = 5;

export interface HubNode {
  id: string;
  index: number;
  x: number;
  y: number;
  angle: number;
  color: string;
  name: string;
  subtitle: string;
  agentCount: number;
  /** Centroid of hub + agents; the camera frames this when drilling in. */
  cx: number;
  cy: number;
  extent: number;
}

export interface AgentNode {
  id: string;
  index: number;
  hubIndex: number;
  x: number;
  y: number;
  color: string;
  phase: number;
}

export interface MapLayout {
  hubs: HubNode[];
  agents: AgentNode[];
  hubById: Map<string, HubNode>;
  agentById: Map<string, AgentNode>;
}

interface ForceNode extends SimulationNodeDatum {
  id: string;
  kind: "core" | "hub" | "agent" | "label";
  hub?: number;
  tx?: number;
  ty?: number;
}

/** Deterministic layout: hubs on a ring, agents settled around them by d3-force. */
export function computeLayout(departments: Department[]): MapLayout {
  const n = departments.length;
  const hubs: HubNode[] = departments.map((d, i) => {
    // Offset by half a step so no hub sits directly above/below the core label.
    const angle = -Math.PI / 2 - Math.PI / n + (i / n) * Math.PI * 2;
    return {
      id: d.id,
      index: i,
      x: Math.cos(angle) * HUB_RADIUS,
      y: Math.sin(angle) * HUB_RADIUS,
      angle,
      color: d.color,
      name: d.name,
      subtitle: d.subtitle,
      agentCount: d.agents.length,
      cx: 0,
      cy: 0,
      extent: 0,
    };
  });

  const nodes: ForceNode[] = [{ id: "__core", kind: "core", x: 0, y: 0, fx: 0, fy: 0 }];
  hubs.forEach((h) => {
    nodes.push({ id: `__hub_${h.id}`, kind: "hub", x: h.x, y: h.y, fx: h.x, fy: h.y });
    // Fixed obstacles that keep agents out of the label area under each hub.
    for (const dy of [34, 58]) {
      for (const dx of [-72, -36, 0, 36, 72]) {
        const lx = h.x + dx;
        const ly = h.y + HUB_SIZE + dy;
        nodes.push({ id: `__label_${h.id}_${dx}_${dy}`, kind: "label", x: lx, y: ly, fx: lx, fy: ly });
      }
    }
  });

  const links: SimulationLinkDatum<ForceNode>[] = [];
  departments.forEach((d, hi) => {
    const hub = hubs[hi];
    d.agents.forEach((a, ai) => {
      // Seed agents on an arc facing away from the core so the solver starts close to the answer.
      const spread = Math.PI * 1.3;
      const off = d.agents.length > 1 ? (ai / (d.agents.length - 1) - 0.5) * spread : 0;
      const ang = hub.angle + off;
      const r = 70 + (ai % 2) * 22;
      nodes.push({
        id: a.id,
        kind: "agent",
        hub: hi,
        x: hub.x + Math.cos(ang) * r,
        y: hub.y + Math.sin(ang) * r,
        tx: Math.cos(hub.angle) * (HUB_RADIUS + 62),
        ty: Math.sin(hub.angle) * (HUB_RADIUS + 62),
      });
      links.push({ source: a.id, target: `__hub_${d.id}` });
    });
  });

  const sim = forceSimulation(nodes)
    .randomSource(mulberry32(7))
    .force(
      "link",
      forceLink<ForceNode, SimulationLinkDatum<ForceNode>>(links)
        .id((d) => d.id)
        .distance(72)
        .strength(0.6),
    )
    .force("charge", forceManyBody<ForceNode>().strength((d) => (d.kind === "agent" ? -90 : d.kind === "label" ? 0 : -400)))
    .force(
      "collide",
      forceCollide<ForceNode>().radius((d) => (d.kind === "core" ? 90 : d.kind === "hub" ? 56 : d.kind === "label" ? 26 : 24)),
    )
    .force("x", forceX<ForceNode>((d) => d.tx ?? 0).strength((d) => (d.kind === "agent" ? 0.06 : 0)))
    .force("y", forceY<ForceNode>((d) => d.ty ?? 0).strength((d) => (d.kind === "agent" ? 0.06 : 0)))
    .stop();

  const maxR = OUTER_RADIUS - 28;
  for (let i = 0; i < 400; i++) {
    sim.tick();
    for (const nd of nodes) {
      if (nd.kind !== "agent") continue;
      const r = Math.hypot(nd.x!, nd.y!);
      if (r > maxR) {
        nd.x = (nd.x! / r) * maxR;
        nd.y = (nd.y! / r) * maxR;
      }
    }
  }

  const agents: AgentNode[] = [];
  nodes.forEach((nd) => {
    if (nd.kind !== "agent") return;
    agents.push({
      id: nd.id,
      index: agents.length,
      hubIndex: nd.hub!,
      x: nd.x!,
      y: nd.y!,
      color: hubs[nd.hub!].color,
      phase: agents.length * 1.7,
    });
  });

  hubs.forEach((h) => {
    const own = agents.filter((a) => a.hubIndex === h.index);
    const pts = [{ x: h.x, y: h.y }, ...own];
    h.cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    h.cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    h.extent = Math.max(...pts.map((p) => Math.hypot(p.x - h.cx, p.y - h.cy))) + 60;
  });

  return {
    hubs,
    agents,
    hubById: new Map(hubs.map((h) => [h.id, h])),
    agentById: new Map(agents.map((a) => [a.id, a])),
  };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
