import type { AgentStatus } from "@/data/types";
import {
  AGENT_SIZE,
  CORE_SIZE,
  HUB_RADIUS,
  HUB_SIZE,
  OUTER_RADIUS,
  type MapLayout,
} from "./layout";

export type Hit = { kind: "core" } | { kind: "hub"; index: number } | { kind: "agent"; index: number } | null;

export interface EngineOptions {
  monoFont: string;
  coreLabel: string;
  onFrame?: (engine: MapEngine) => void;
  onFps?: (fps: number) => void;
}

const BG = "#07070a";
const ORANGE = "#ff5a1f";
const RED = "#ff3b1f";
const GOLD = "#ffb020";

const KIND_AMBIENT = 0;
const KIND_KB = 1;
const KIND_TASK = 2;

const STATUS_CODE: Record<AgentStatus, number> = { idle: 0, working: 1, blocked: 2 };

const MAX_PARTICLES = 1400;
// Calm mode: no background traffic. Particles only appear for real run events.
const AMBIENT_TARGET = 0;
const AMBIENT_TARGET_REDUCED = 0;

/* ---------------------------- sprite cache --------------------------- */

const spriteCache = new Map<string, HTMLCanvasElement>();
function glowSprite(color: string, hard = 0.18): HTMLCanvasElement {
  const key = `${color}|${hard}`;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  const [r, gg, b] = hexToRgb(color);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(hard * 0.5, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(hard, `rgba(${r},${gg},${b},0.75)`);
  grad.addColorStop(0.45, `rgba(${r},${gg},${b},0.18)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  spriteCache.set(key, c);
  return c;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ------------------------------- engine ------------------------------ */

export class MapEngine {
  private ctx: CanvasRenderingContext2D;
  private layout: MapLayout;
  private opts: EngineOptions;
  private raf = 0;
  private last = 0;
  private time = 0;
  private dpr = 1;
  width = 0;
  height = 0;
  private insetLeft = 0;
  private insetTop = 0;
  private insetRight = 0;
  private insetBottom = 0;

  // camera: world point (x, y) at the viewport centre, scale k
  cam = { x: 0, y: 0, k: 1 };
  private target = { x: 0, y: 0, k: 1 };
  private focusHub = -1;
  private userMoved = false;

  // interaction state
  hoverHub = -1;
  hoverAgent = -1;
  hoverCore = false;
  highlightHub = -1;
  selectedAgent = -1;
  /** Agents highlighted during "Ask the Knowledge Core"; everything else dims. */
  spotlight = new Set<number>();
  private spotHubs = new Set<number>();
  private statuses: Uint8Array;
  private automation: Float32Array;
  reducedMotion = false;

  // node positions after drift
  private ax: Float32Array;
  private ay: Float32Array;
  private agentFlash: Float32Array;
  private hubFlash: Float32Array;
  private coreFlash = 0;
  private pulses: number[] = [];

  // edges: [0, A) agent→hub, [A, A+H) hub→core. Stored outer end → inner end.
  private E: number;
  private ex0: Float32Array;
  private ey0: Float32Array;
  private ecx: Float32Array;
  private ecy: Float32Array;
  private ex1: Float32Array;
  private ey1: Float32Array;
  private eLen: Float32Array;
  private eHub: Int16Array;

  // particles (struct of arrays)
  private pCount = 0;
  private pEdge = new Int16Array(MAX_PARTICLES);
  private pT = new Float32Array(MAX_PARTICLES);
  private pSpeed = new Float32Array(MAX_PARTICLES);
  private pDir = new Int8Array(MAX_PARTICLES);
  private pKind = new Uint8Array(MAX_PARTICLES);
  private pSize = new Float32Array(MAX_PARTICLES);
  private pOff = new Float32Array(MAX_PARTICLES);
  private pColor = new Uint8Array(MAX_PARTICLES);
  private pTarget = new Int16Array(MAX_PARTICLES);
  private particleSprites: HTMLCanvasElement[];

  private stars: HTMLCanvasElement | null = null;
  private fpsFrames = 0;
  private fpsTime = 0;

  constructor(canvas: HTMLCanvasElement, layout: MapLayout, opts: EngineOptions) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.layout = layout;
    this.opts = opts;

    const A = layout.agents.length;
    const H = layout.hubs.length;
    this.E = A + H;
    this.statuses = new Uint8Array(A);
    this.automation = new Float32Array(A);
    this.ax = new Float32Array(A);
    this.ay = new Float32Array(A);
    this.agentFlash = new Float32Array(A);
    this.hubFlash = new Float32Array(H);
    this.ex0 = new Float32Array(this.E);
    this.ey0 = new Float32Array(this.E);
    this.ecx = new Float32Array(this.E);
    this.ecy = new Float32Array(this.E);
    this.ex1 = new Float32Array(this.E);
    this.ey1 = new Float32Array(this.E);
    this.eLen = new Float32Array(this.E);
    this.eHub = new Int16Array(this.E);
    layout.agents.forEach((a, i) => (this.eHub[i] = a.hubIndex));
    layout.hubs.forEach((h, i) => (this.eHub[A + i] = i));

    this.particleSprites = [glowSprite(ORANGE), glowSprite(RED), glowSprite(GOLD, 0.25)];
    this.updateGeometry();
    for (let e = 0; e < this.E; e++) {
      this.eLen[e] = Math.hypot(this.ex1[e] - this.ex0[e], this.ey1[e] - this.ey0[e]) * 1.08;
    }
  }

  /* ------------------------------ public ----------------------------- */

  start() {
    this.last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      this.frame(dt);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  resize(width: number, height: number) {
    const canvas = this.ctx.canvas;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width;
    this.height = height;
    canvas.width = Math.round(width * this.dpr);
    canvas.height = Math.round(height * this.dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    this.stars = this.buildStars();
    this.retarget(true);
  }

  setInsets(left: number, top: number, right = 0, bottom = 0) {
    this.insetLeft = left;
    this.insetTop = top;
    this.insetRight = right;
    this.insetBottom = bottom;
    this.retarget(false);
  }

  setStatuses(list: AgentStatus[]) {
    list.forEach((s, i) => (this.statuses[i] = STATUS_CODE[s]));
  }

  setSpotlight(indices: number[]) {
    this.spotlight = new Set(indices);
    this.spotHubs = new Set(indices.map((i) => this.layout.agents[i].hubIndex));
  }

  /** Share of automated process steps per agent (0–1), drawn as an arc around the dot. */
  setAutomation(values: number[]) {
    values.forEach((v, i) => (this.automation[i] = v));
  }

  setReducedMotion(on: boolean) {
    this.reducedMotion = on;
  }

  focus(hubIndex: number) {
    this.focusHub = hubIndex;
    this.userMoved = false;
    this.retarget(false);
  }

  resetView() {
    this.focusHub = -1;
    this.userMoved = false;
    this.retarget(false);
  }

  zoomAt(sx: number, sy: number, factor: number) {
    const k = clamp(this.target.k * factor, this.fitScale() * 0.5, this.fitScale() * 8);
    const [wx, wy] = this.screenToWorldWith(this.target, sx, sy);
    const [cx, cy] = this.viewCenter();
    this.target.k = k;
    this.target.x = wx - (sx - cx) / k;
    this.target.y = wy - (sy - cy) / k;
    this.userMoved = true;
    if (this.reducedMotion) Object.assign(this.cam, this.target);
  }

  panBy(dx: number, dy: number) {
    this.target.x -= dx / this.target.k;
    this.target.y -= dy / this.target.k;
    this.cam.x -= dx / this.cam.k;
    this.cam.y -= dy / this.cam.k;
    this.userMoved = true;
  }

  worldToScreen(x: number, y: number): [number, number] {
    const [cx, cy] = this.viewCenter();
    return [(x - this.cam.x) * this.cam.k + cx, (y - this.cam.y) * this.cam.k + cy];
  }

  agentScreen(i: number): [number, number] {
    return this.worldToScreen(this.ax[i], this.ay[i]);
  }

  hitTest(sx: number, sy: number): Hit {
    const [wx, wy] = this.screenToWorldWith(this.cam, sx, sy);
    const k = this.cam.k;
    let best = -1;
    let bestD = Math.max(AGENT_SIZE * 2.4, 11 / k);
    for (let i = 0; i < this.ax.length; i++) {
      const d = Math.hypot(this.ax[i] - wx, this.ay[i] - wy);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) return { kind: "agent", index: best };
    for (const h of this.layout.hubs) {
      if (Math.hypot(h.x - wx, h.y - wy) < HUB_SIZE + 8) return { kind: "hub", index: h.index };
    }
    if (Math.hypot(wx, wy) < CORE_SIZE + 10) return { kind: "core" };
    return null;
  }

  /** An agent read the knowledge base: stream gold particles agent → hub → core. */
  emitKbRead(agentIndex: number) {
    this.agentFlash[agentIndex] = 1;
    const n = this.reducedMotion ? 2 : 7;
    for (let i = 0; i < n; i++) {
      this.spawn(agentIndex, -i * 0.09, 1, KIND_KB, 2, 0.55 + Math.random() * 0.15, 1.6 + Math.random() * 0.8);
    }
  }

  /** A run finished: stream back into the core, gold on success, red on failure. */
  emitRunResult(agentIndex: number, ok: boolean) {
    this.agentFlash[agentIndex] = 1;
    const n = this.reducedMotion ? 2 : 7;
    for (let i = 0; i < n; i++) {
      this.spawn(agentIndex, -i * 0.09, 1, KIND_KB, ok ? 2 : 1, 0.55 + Math.random() * 0.15, 1.6 + Math.random() * 0.8);
    }
  }

  /** Task handed in (agent → core) or out (core → agent). */
  emitTaskFlow(agentIndex: number, direction: "in" | "out") {
    const A = this.layout.agents.length;
    const n = this.reducedMotion ? 1 : 4;
    for (let i = 0; i < n; i++) {
      const color = Math.random() < 0.5 ? 0 : 1;
      if (direction === "in") {
        this.spawn(agentIndex, -i * 0.07, 1, KIND_TASK, color, 0.45, 1.4);
      } else {
        const hub = this.layout.agents[agentIndex].hubIndex;
        const p = this.spawn(A + hub, -i * 0.07, -1, KIND_TASK, color, 0.5, 1.4);
        if (p >= 0) this.pTarget[p] = agentIndex;
      }
    }
  }

  get particleCount() {
    return this.pCount;
  }

  /* ----------------------------- internals ---------------------------- */

  private viewCenter(): [number, number] {
    return [this.insetLeft + (this.width - this.insetLeft - this.insetRight) / 2, this.insetTop + (this.height - this.insetTop - this.insetBottom) / 2];
  }

  private fitScale() {
    const w = Math.max(200, this.width - this.insetLeft - this.insetRight - 48);
    const h = Math.max(200, this.height - this.insetTop - this.insetBottom - 40);
    return Math.min(w, h) / (OUTER_RADIUS * 2 + 40);
  }

  private screenToWorldWith(c: { x: number; y: number; k: number }, sx: number, sy: number): [number, number] {
    const [cx, cy] = this.viewCenter();
    return [(sx - cx) / c.k + c.x, (sy - cy) / c.k + c.y];
  }

  private retarget(snap: boolean) {
    if (!this.width) return;
    if (this.userMoved && !snap) return;
    if (this.focusHub >= 0) {
      const h = this.layout.hubs[this.focusHub];
      const w = this.width - this.insetLeft - this.insetRight;
      const hh = this.height - this.insetTop - this.insetBottom;
      this.target = { x: h.cx, y: h.cy, k: Math.min(this.fitScale() * 2.2, Math.min(w, hh) / (Math.max(h.extent, 170) * 2.9)) };
    } else {
      this.target = { x: 0, y: 0, k: this.fitScale() };
    }
    if (snap || this.reducedMotion || this.cam.k === 1) Object.assign(this.cam, this.target);
  }

  private buildStars(): HTMLCanvasElement {
    const pad = 60;
    const w = this.width + pad * 2;
    const h = this.height + pad * 2;
    const c = document.createElement("canvas");
    c.width = Math.round(w * this.dpr);
    c.height = Math.round(h * this.dpr);
    const g = c.getContext("2d")!;
    g.scale(this.dpr, this.dpr);
    g.fillStyle = BG;
    g.fillRect(0, 0, w, h);

    const neb = g.createRadialGradient(w * 0.55, h * 0.5, 0, w * 0.55, h * 0.5, Math.max(w, h) * 0.6);
    neb.addColorStop(0, "rgba(255,70,20,0.07)");
    neb.addColorStop(0.5, "rgba(120,20,10,0.03)");
    neb.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = neb;
    g.fillRect(0, 0, w, h);

    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const count = Math.round((w * h) / 1500);
    for (let i = 0; i < count; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = rnd() < 0.96 ? rnd() * 0.8 + 0.2 : rnd() * 1.2 + 0.8;
      const a = rnd() * 0.5 + 0.08;
      const warm = rnd() < 0.18;
      g.fillStyle = warm ? `rgba(255,170,120,${a})` : `rgba(220,225,255,${a * 0.8})`;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return c;
  }

  private updateGeometry() {
    const { agents, hubs } = this.layout;
    const t = this.time;
    const drift = this.reducedMotion ? 0 : 2.6;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      this.ax[i] = a.x + Math.sin(t * 0.45 + a.phase) * drift;
      this.ay[i] = a.y + Math.cos(t * 0.38 + a.phase * 1.3) * drift;
    }
    const A = agents.length;
    for (let i = 0; i < A; i++) {
      const h = hubs[agents[i].hubIndex];
      this.setEdge(i, this.ax[i], this.ay[i], h.x, h.y, i % 2 ? 0.2 : -0.2);
    }
    for (let i = 0; i < hubs.length; i++) {
      this.setEdge(A + i, hubs[i].x, hubs[i].y, 0, 0, 0.16);
    }
  }

  private setEdge(e: number, x0: number, y0: number, x1: number, y1: number, bend: number) {
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const dx = x1 - x0;
    const dy = y1 - y0;
    this.ex0[e] = x0;
    this.ey0[e] = y0;
    this.ex1[e] = x1;
    this.ey1[e] = y1;
    this.ecx[e] = mx - dy * bend;
    this.ecy[e] = my + dx * bend;
  }

  private spawn(
    edge: number,
    t: number,
    dir: number,
    kind: number,
    color: number,
    speedPx: number,
    size: number,
  ): number {
    if (this.pCount >= MAX_PARTICLES) return -1;
    const p = this.pCount++;
    this.pEdge[p] = edge;
    this.pT[p] = t;
    this.pDir[p] = dir;
    this.pKind[p] = kind;
    this.pColor[p] = color;
    this.pSpeed[p] = speedPx;
    this.pSize[p] = size;
    this.pOff[p] = (Math.random() - 0.5) * (kind === KIND_AMBIENT ? 5 : 2.5);
    this.pTarget[p] = -1;
    return p;
  }

  private kill(p: number) {
    const last = --this.pCount;
    if (p === last) return;
    this.pEdge[p] = this.pEdge[last];
    this.pT[p] = this.pT[last];
    this.pDir[p] = this.pDir[last];
    this.pKind[p] = this.pKind[last];
    this.pColor[p] = this.pColor[last];
    this.pSpeed[p] = this.pSpeed[last];
    this.pSize[p] = this.pSize[last];
    this.pOff[p] = this.pOff[last];
    this.pTarget[p] = this.pTarget[last];
  }

  private randomAmbientEdge(): number {
    const A = this.layout.agents.length;
    if (Math.random() < 0.2) return A + Math.floor(Math.random() * this.layout.hubs.length);
    // Working agents carry three times the traffic of idle ones; blocked ones barely any.
    for (let tries = 0; tries < 6; tries++) {
      const i = Math.floor(Math.random() * A);
      const s = this.statuses[i];
      const w = s === 1 ? 1 : s === 0 ? 0.35 : 0.08;
      if (Math.random() < w) return i;
    }
    return Math.floor(Math.random() * A);
  }

  private spawnAmbient(randomT: boolean) {
    const e = this.randomAmbientEdge();
    const p = this.spawn(
      e,
      randomT ? Math.random() : 0,
      Math.random() < 0.6 ? 1 : -1,
      KIND_AMBIENT,
      Math.random() < 0.12 ? 2 : Math.random() < 0.55 ? 0 : 1,
      0.22 + Math.random() * 0.3,
      0.7 + Math.random() * 0.9,
    );
    return p;
  }

  private stepParticles(dt: number) {
    const A = this.layout.agents.length;
    const target = this.reducedMotion ? AMBIENT_TARGET_REDUCED : AMBIENT_TARGET;
    const speedScale = this.reducedMotion ? 0.35 : 1;

    let ambient = 0;
    for (let p = 0; p < this.pCount; p++) if (this.pKind[p] === KIND_AMBIENT) ambient++;
    let deficit = target - ambient;
    const first = this.pCount === 0;
    while (deficit-- > 0) this.spawnAmbient(first || Math.random() < 0.02);
    // Trim if reduced motion was just switched on.
    for (let p = this.pCount - 1; p >= 0 && ambient > target; p--) {
      if (this.pKind[p] === KIND_AMBIENT) {
        this.kill(p);
        ambient--;
      }
    }

    for (let p = this.pCount - 1; p >= 0; p--) {
      const e = this.pEdge[p];
      // speed is ~edge-lengths/sec normalised to a 180px reference so long edges don't look faster
      this.pT[p] += (dt * this.pSpeed[p] * speedScale * 180) / this.eLen[e];
      if (this.pT[p] < 1) continue;

      const kind = this.pKind[p];
      const dir = this.pDir[p];
      if (kind === KIND_AMBIENT) {
        this.pEdge[p] = this.randomAmbientEdge();
        this.pT[p] = 0;
        this.pDir[p] = Math.random() < 0.6 ? 1 : -1;
        continue;
      }
      if (dir === 1 && e < A) {
        // reached hub → continue to core
        this.hubFlash[this.eHub[e]] = Math.min(1, this.hubFlash[this.eHub[e]] + 0.25);
        this.pEdge[p] = A + this.eHub[e];
        this.pT[p] = 0;
      } else if (dir === 1) {
        // reached the core
        this.coreFlash = Math.min(1.4, this.coreFlash + (kind === KIND_KB ? 0.22 : 0.1));
        if (kind === KIND_KB && (this.pulses.length === 0 || this.time - this.pulses[this.pulses.length - 1] > 0.35)) {
          this.pulses.push(this.time);
        }
        this.kill(p);
      } else if (e >= A && this.pTarget[p] >= 0) {
        // left the core, reached hub → continue out to the agent
        this.hubFlash[e - A] = Math.min(1, this.hubFlash[e - A] + 0.2);
        this.pEdge[p] = this.pTarget[p];
        this.pT[p] = 0;
      } else {
        if (e < A) this.agentFlash[e] = 1;
        this.kill(p);
      }
    }
  }

  private frame(dt: number) {
    this.time += dt;
    this.fpsFrames++;
    this.fpsTime += dt;
    if (this.fpsTime > 0.5) {
      this.opts.onFps?.(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    // camera easing
    const ease = this.reducedMotion ? 1 : 1 - Math.exp(-dt * 5);
    this.cam.x += (this.target.x - this.cam.x) * ease;
    this.cam.y += (this.target.y - this.cam.y) * ease;
    this.cam.k += (this.target.k - this.cam.k) * ease;

    // decay
    const decay = Math.exp(-dt * 2.2);
    this.coreFlash *= Math.exp(-dt * 1.6);
    for (let i = 0; i < this.agentFlash.length; i++) this.agentFlash[i] *= decay;
    for (let i = 0; i < this.hubFlash.length; i++) this.hubFlash[i] *= decay;
    while (this.pulses.length && this.time - this.pulses[0] > 2.2) this.pulses.shift();

    this.updateGeometry();
    this.stepParticles(dt);
    this.draw();
    this.opts.onFrame?.(this);
  }

  /* ------------------------------ drawing ----------------------------- */

  private focusHubFor(): number {
    if (this.highlightHub >= 0) return this.highlightHub;
    if (this.hoverHub >= 0) return this.hoverHub;
    if (this.hoverAgent >= 0) return this.layout.agents[this.hoverAgent].hubIndex;
    return this.focusHub;
  }

  private draw() {
    const ctx = this.ctx;
    const { dpr, width, height } = this;
    const k = this.cam.k;
    const [cx, cy] = this.viewCenter();
    const hl = this.focusHubFor();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    if (this.stars) {
      const px = clamp(-this.cam.x * 0.04, -60, 60);
      const py = clamp(-this.cam.y * 0.04, -60, 60);
      ctx.drawImage(this.stars, Math.round((px - 60) * dpr), Math.round((py - 60) * dpr));
    } else {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, width * dpr, height * dpr);
    }

    // world transform
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * (cx - this.cam.x * k), dpr * (cy - this.cam.y * k));
    const px1 = 1 / k; // one screen pixel in world units

    this.drawOrbit(px1);
    this.drawEdges(px1, hl);
    this.drawParticles(px1, hl);
    this.drawCore(px1);
    this.drawHubs(px1, hl);
    this.drawAgents(px1, hl);

    // screen-space labels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    this.drawLabels(hl);
  }

  private drawOrbit(px: number) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = px;
    ctx.strokeStyle = "rgba(255,90,31,0.22)";
    ctx.beginPath();
    ctx.arc(0, 0, OUTER_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,90,31,0.07)";
    ctx.beginPath();
    ctx.arc(0, 0, OUTER_RADIUS + 14, 0, Math.PI * 2);
    ctx.stroke();

    // ticks
    ctx.beginPath();
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2;
      const len = i % 10 === 0 ? 10 : 4;
      const c = Math.cos(a);
      const s = Math.sin(a);
      ctx.moveTo(c * OUTER_RADIUS, s * OUTER_RADIUS);
      ctx.lineTo(c * (OUTER_RADIUS + len), s * (OUTER_RADIUS + len));
    }
    ctx.strokeStyle = "rgba(255,90,31,0.22)";
    ctx.stroke();

    ctx.setLineDash([2 * px, 8 * px]);
    ctx.strokeStyle = "rgba(255,90,31,0.1)";
    ctx.beginPath();
    ctx.arc(0, 0, HUB_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawEdges(px: number, hl: number) {
    const ctx = this.ctx;
    const A = this.layout.agents.length;
    ctx.globalCompositeOperation = "lighter";
    for (let e = 0; e < this.E; e++) {
      const hub = this.eHub[e];
      const isHub = e >= A;
      const spot = this.spotlight.size > 0;
      const on = spot ? (isHub ? this.spotHubs.has(hub) : this.spotlight.has(e)) : hl < 0 || hub === hl;
      const hoverPath = this.hoverAgent >= 0 && (e === this.hoverAgent || (isHub && hub === this.layout.agents[this.hoverAgent].hubIndex));
      const selPath = this.selectedAgent >= 0 && e === this.selectedAgent;
      let a = isHub ? 0.42 : 0.3;
      if (!on) a *= spot ? 0.12 : 0.25;
      else if (hl >= 0 || spot) a *= spot ? 2.6 : 1.6;
      if (hoverPath || selPath) a = 0.85;
      ctx.strokeStyle = isHub ? rgba(ORANGE, a) : rgba(this.layout.hubs[hub].color, a);
      ctx.lineWidth = (isHub ? 1.4 : 0.9) * px;
      ctx.beginPath();
      ctx.moveTo(this.ex0[e], this.ey0[e]);
      ctx.quadraticCurveTo(this.ecx[e], this.ecy[e], this.ex1[e], this.ey1[e]);
      ctx.stroke();
    }
  }

  private drawParticles(px: number, hl: number) {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = "lighter";
    const minSize = 1.1 * px;
    for (let p = 0; p < this.pCount; p++) {
      const t = this.pT[p];
      if (t < 0) continue;
      const e = this.pEdge[p];
      const u = this.pDir[p] === 1 ? t : 1 - t;
      const iu = 1 - u;
      const x0 = this.ex0[e];
      const y0 = this.ey0[e];
      const qx = this.ecx[e];
      const qy = this.ecy[e];
      const x1 = this.ex1[e];
      const y1 = this.ey1[e];
      let x = iu * iu * x0 + 2 * iu * u * qx + u * u * x1;
      let y = iu * iu * y0 + 2 * iu * u * qy + u * u * y1;
      const off = this.pOff[p];
      if (off !== 0) {
        const dx = 2 * iu * (qx - x0) + 2 * u * (x1 - qx);
        const dy = 2 * iu * (qy - y0) + 2 * u * (y1 - qy);
        const inv = off / (Math.hypot(dx, dy) || 1);
        x -= dy * inv;
        y += dx * inv;
      }

      const kind = this.pKind[p];
      const fade = Math.min(1, t * 6, (1 - t) * 6);
      let a = kind === KIND_AMBIENT ? 0.72 : 1;
      if (this.spotlight.size > 0) {
        const lit = e >= this.layout.agents.length ? this.spotHubs.has(this.eHub[e]) : this.spotlight.has(e);
        if (!lit) a *= 0.12;
      } else if (hl >= 0 && this.eHub[e] !== hl) a *= 0.22;
      ctx.globalAlpha = a * fade;
      const s = Math.max(this.pSize[p], minSize) * (kind === KIND_KB ? 4.4 : 3.8);
      ctx.drawImage(this.particleSprites[this.pColor[p]], x - s, y - s, s * 2, s * 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawCore(px: number) {
    const ctx = this.ctx;
    const t = this.time;
    const flash = this.coreFlash;
    const breathe = this.reducedMotion ? 0 : Math.sin(t * 1.4) * 0.06;

    ctx.globalCompositeOperation = "lighter";
    const glow = glowSprite(GOLD, 0.12);
    const gr = CORE_SIZE * (4.2 + flash * 0.8 + breathe * 4);
    ctx.globalAlpha = 0.5 + flash * 0.25;
    ctx.drawImage(glow, -gr, -gr, gr * 2, gr * 2);
    const glow2 = glowSprite(RED, 0.1);
    const gr2 = CORE_SIZE * 7;
    ctx.globalAlpha = 0.18 + flash * 0.08;
    ctx.drawImage(glow2, -gr2, -gr2, gr2 * 2, gr2 * 2);
    ctx.globalAlpha = 1;

    // pulses
    for (const start of this.pulses) {
      const age = (t - start) / 2.2;
      const r = CORE_SIZE + age * 150;
      ctx.strokeStyle = rgba(GOLD, (1 - age) * 0.5);
      ctx.lineWidth = (2 - age * 1.5) * px;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // orb
    ctx.globalCompositeOperation = "source-over";
    const r = CORE_SIZE * (1 + breathe * 0.3 + flash * 0.04);
    const orb = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r);
    orb.addColorStop(0, "#fff6d8");
    orb.addColorStop(0.28, "#ffd36a");
    orb.addColorStop(0.62, "#ff8a1f");
    orb.addColorStop(0.9, "#d9340f");
    orb.addColorStop(1, "#7a1a08");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 1.2 * px;
    ctx.strokeStyle = rgba(GOLD, 0.55);
    ctx.beginPath();
    ctx.arc(0, 0, CORE_SIZE + 10, 0, Math.PI * 2);
    ctx.stroke();

    const rot = this.reducedMotion ? 0 : t * 0.25;
    ctx.setLineDash([14 * px, 10 * px]);
    ctx.lineDashOffset = -rot * 40;
    ctx.strokeStyle = rgba(ORANGE, 0.4);
    ctx.beginPath();
    ctx.arc(0, 0, CORE_SIZE + 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    if (this.hoverCore) {
      ctx.strokeStyle = rgba(GOLD, 0.9);
      ctx.lineWidth = 1.5 * px;
      ctx.beginPath();
      ctx.arc(0, 0, CORE_SIZE + 30, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawHubs(px: number, hl: number) {
    const ctx = this.ctx;
    for (const h of this.layout.hubs) {
      const spot = this.spotlight.size > 0;
      const on = spot ? this.spotHubs.has(h.index) : hl < 0 || hl === h.index;
      const active = spot ? this.spotHubs.has(h.index) : hl === h.index;
      const flash = this.hubFlash[h.index];
      const dim = on ? 1 : 0.35;

      ctx.globalCompositeOperation = "lighter";
      const g = glowSprite(h.color, 0.08);
      const gr = HUB_SIZE * (active ? 3.6 : 2.8) * (1 + flash * 0.25);
      ctx.globalAlpha = (active ? 0.55 : 0.28 + flash * 0.3) * dim;
      ctx.drawImage(g, h.x - gr, h.y - gr, gr * 2, gr * 2);
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(12,9,9,0.92)";
      ctx.beginPath();
      ctx.arc(h.x, h.y, HUB_SIZE, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = (active ? 2.2 : 1.6) * px;
      ctx.strokeStyle = rgba(h.color, (0.85 + flash * 0.15) * dim);
      ctx.beginPath();
      ctx.arc(h.x, h.y, HUB_SIZE, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = px;
      ctx.strokeStyle = rgba(h.color, 0.3 * dim);
      ctx.beginPath();
      ctx.arc(h.x, h.y, HUB_SIZE + 7, 0, Math.PI * 2);
      ctx.stroke();

      // rotating arc segment
      const a0 = (this.reducedMotion ? 0 : this.time * 0.6) + h.index;
      ctx.lineWidth = 2 * px;
      ctx.strokeStyle = rgba(h.color, 0.7 * dim);
      ctx.beginPath();
      ctx.arc(h.x, h.y, HUB_SIZE + 7, a0, a0 + 0.9);
      ctx.stroke();
    }
  }

  private drawAgents(px: number, hl: number) {
    const ctx = this.ctx;
    const t = this.time;
    const { agents } = this.layout;
    for (let i = 0; i < agents.length; i++) {
      const a = agents[i];
      const x = this.ax[i];
      const y = this.ay[i];
      const status = this.statuses[i];
      const on = this.spotlight.size > 0 ? this.spotlight.has(i) : hl < 0 || hl === a.hubIndex;
      const dim = on ? 1 : this.spotlight.size > 0 ? 0.18 : 0.3;
      const flash = this.agentFlash[i];
      const pulse = this.reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(t * 3 + a.phase);

      const color = status === 2 ? "#ff1f1f" : a.color;
      let glowA = status === 1 ? 0.55 + pulse * 0.25 : status === 2 ? 0.35 + pulse * 0.45 : 0.3;
      glowA = Math.min(1, glowA + flash * 0.6) * dim;

      ctx.globalCompositeOperation = "lighter";
      const gs = AGENT_SIZE * (4 + flash * 2);
      ctx.globalAlpha = glowA;
      ctx.drawImage(glowSprite(color, 0.14), x - gs, y - gs, gs * 2, gs * 2);
      ctx.globalAlpha = 1;

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = status === 1 ? "#ffe6cf" : status === 2 ? "#ff4a3a" : rgba(a.color, 0.85);
      ctx.globalAlpha = dim;
      ctx.beginPath();
      ctx.arc(x, y, AGENT_SIZE * (status === 0 ? 0.8 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const auto = this.automation[i];
      ctx.globalAlpha = dim;
      ctx.lineWidth = 1.6 * px;
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(x, y, AGENT_SIZE + 3.2, 0, Math.PI * 2);
      ctx.stroke();
      if (auto > 0) {
        ctx.strokeStyle = rgba(GOLD, 0.9);
        ctx.beginPath();
        ctx.arc(x, y, AGENT_SIZE + 3.2, -Math.PI / 2, -Math.PI / 2 + auto * Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (status === 2) {
        ctx.strokeStyle = rgba("#ff2a1a", 0.4 + pulse * 0.5);
        ctx.lineWidth = 1.2 * px;
        ctx.beginPath();
        ctx.arc(x, y, AGENT_SIZE + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (i === this.hoverAgent || i === this.selectedAgent || this.spotlight.has(i)) {
        ctx.strokeStyle = rgba(GOLD, this.spotlight.has(i) ? 0.55 + pulse * 0.4 : 0.95);
        ctx.lineWidth = 1.5 * px;
        ctx.beginPath();
        ctx.arc(x, y, AGENT_SIZE + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawLabels(hl: number) {
    const ctx = this.ctx;
    const k = this.cam.k;
    const fit = this.fitScale();
    const zoom = k / fit;
    const font = this.opts.monoFont;
    const scale = clamp(Math.sqrt(zoom), 0.85, 1.35);
    const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 8;

    // core label
    const [csx, csy] = this.worldToScreen(0, 0);
    const coreR = (CORE_SIZE + 22) * k;
    c.letterSpacing = "3px";
    ctx.font = `600 ${Math.round(11 * scale)}px ${font}`;
    ctx.fillStyle = "rgba(255,200,120,0.95)";
    ctx.fillText(this.opts.coreLabel.toUpperCase(), csx, csy + coreR + 14 * scale);

    for (const h of this.layout.hubs) {
      const [sx, sy] = this.worldToScreen(h.x, h.y);
      const on = this.spotlight.size > 0 ? this.spotHubs.has(h.index) : hl < 0 || hl === h.index;
      const r = HUB_SIZE * k;
      ctx.globalAlpha = on ? 1 : 0.4;

      c.letterSpacing = "0px";
      ctx.font = `600 ${Math.round(Math.max(11, Math.min(r * 0.75, 26)))}px ${font}`;
      ctx.fillStyle = "#fff1e6";
      ctx.fillText(String(h.agentCount), sx, sy + 1);

      const base = sy + r + 16 * scale;
      c.letterSpacing = "3px";
      ctx.font = `700 ${Math.round(11.5 * scale)}px ${font}`;
      ctx.fillStyle = h.color;
      ctx.fillText(h.name.toUpperCase(), sx, base);
      c.letterSpacing = "0.5px";
      ctx.font = `400 ${Math.round(10 * scale)}px ${font}`;
      ctx.fillStyle = "rgba(255,225,205,0.55)";
      ctx.fillText(h.subtitle, sx, base + 15 * scale);
    }
    ctx.globalAlpha = 1;

    // agent names once zoomed in enough
    if (zoom > 1.6 || this.hoverAgent >= 0 || this.selectedAgent >= 0 || this.spotlight.size > 0) {
      c.letterSpacing = "1.5px";
      ctx.font = `500 ${Math.round(10 * scale)}px ${font}`;
      ctx.textAlign = "left";
      for (let i = 0; i < this.layout.agents.length; i++) {
        const a = this.layout.agents[i];
        const show =
          this.spotlight.size > 0
            ? this.spotlight.has(i)
            : zoom > 1.6
              ? hl < 0 || hl === a.hubIndex
              : i === this.hoverAgent || i === this.selectedAgent;
        if (!show) continue;
        const [sx, sy] = this.agentScreen(i);
        ctx.fillStyle =
          i === this.hoverAgent || i === this.selectedAgent || this.spotlight.has(i) ? "#ffd48a" : "rgba(255,225,205,0.75)";
        const left = a.x < this.layout.hubs[a.hubIndex].x - 4;
        const gap = (AGENT_SIZE + 6) * k + 6;
        ctx.textAlign = left ? "right" : "left";
        ctx.fillText(this.names[i] ?? "", left ? sx - gap : sx + gap, sy);
      }
      ctx.textAlign = "center";
    }
    c.letterSpacing = "0px";
    ctx.shadowBlur = 0;
  }

  names: string[] = [];
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
