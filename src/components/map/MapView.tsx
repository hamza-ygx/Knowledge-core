"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { KNOWLEDGE_CORE_LABEL, departments } from "@/data/org";
import { useT } from "@/i18n";
import { mono } from "@/app/fonts";
import { simEvents } from "@/store/events";
import { useOrgStore } from "@/store/useOrgStore";
import { MapEngine, type Hit } from "./engine";
import { computeLayout } from "./layout";

interface Props {
  insetLeft: number;
  insetTop: number;
  insetRight: number;
  insetBottom?: number;
}

const sameHit = (a: Hit, b: Hit) =>
  a === b || (!!a && !!b && a.kind === b.kind && (a.kind === "core" || (a as { index: number }).index === (b as { index: number }).index));

export default function MapView({ insetLeft, insetTop, insetRight, insetBottom = 0 }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLSpanElement>(null);
  const focusBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverRef = useRef<Hit>(null);
  const [hover, setHover] = useState<Hit>(null);

  const layout = useMemo(() => computeLayout(departments), []);
  const agents = useOrgStore((s) => s.agents);
  const showHud = useOrgStore((s) => s.showHud);
  const { t, tx } = useT();

  // Stable node list for the keyboard overlay: core, then each hub followed by its agents.
  const focusables = useMemo(() => {
    const list: { hit: NonNullable<Hit> }[] = [{ hit: { kind: "core" } }];
    layout.hubs.forEach((h) => {
      list.push({ hit: { kind: "hub", index: h.index } });
      layout.agents.filter((a) => a.hubIndex === h.index).forEach((a) => list.push({ hit: { kind: "agent", index: a.index } }));
    });
    return list;
  }, [layout]);

  const focusLabel = (hit: NonNullable<Hit>) => {
    if (hit.kind === "core") return tx(KNOWLEDGE_CORE_LABEL);
    if (hit.kind === "hub") {
      const d = departments[hit.index];
      return t("map.hubAria", { name: tx(d.name), n: d.agents.length });
    }
    const a = agents.find((x) => x.id === layout.agents[hit.index].id);
    return a ? `${a.name}, ${tx(a.role)}` : "";
  };

  const setHoverHit = (hit: Hit) => {
    const engine = engineRef.current;
    if (!engine || sameHit(hit, hoverRef.current)) return;
    hoverRef.current = hit;
    engine.hoverAgent = hit?.kind === "agent" ? hit.index : -1;
    engine.hoverHub = hit?.kind === "hub" ? hit.index : -1;
    engine.hoverCore = hit?.kind === "core";
    setHover(hit);
  };

  const activate = (hit: Hit) => {
    const s = useOrgStore.getState();
    if (!hit) return;
    if (hit.kind === "agent") s.selectAgent(layout.agents[hit.index].id);
    else if (hit.kind === "hub") {
      s.setAutoTour(false);
      s.focusDept(layout.hubs[hit.index].id);
      engineRef.current?.focus(hit.index);
    } else {
      s.setAutoTour(false);
      s.focusDept(null);
      engineRef.current?.resetView();
    }
  };

  /* --------------------------- engine lifecycle --------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const byId = new Map(layout.agents.map((a) => [a.id, a.index]));
    const hubIdx = (id: string | null) => (id ? (layout.hubById.get(id)?.index ?? -1) : -1);

    const engine = new MapEngine(canvas, layout, {
      monoFont: mono.style.fontFamily,
      coreLabel: KNOWLEDGE_CORE_LABEL,
      onFps: (fps) => {
        if (statsRef.current) statsRef.current.textContent = `${Math.round(fps)} FPS · ${engine.particleCount} particles`;
      },
      onFrame: (e) => {
        const hit = hoverRef.current;
        const tip = tooltipRef.current;
        if (tip && hit) {
          const [x, y] =
            hit.kind === "agent"
              ? e.agentScreen(hit.index)
              : hit.kind === "hub"
                ? e.worldToScreen(layout.hubs[hit.index].x, layout.hubs[hit.index].y)
                : e.worldToScreen(0, 0);
          tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        }
        focusables.forEach((f, i) => {
          const el = focusBtnRefs.current[i];
          if (!el) return;
          const [x, y] =
            f.hit.kind === "agent"
              ? e.agentScreen(f.hit.index)
              : f.hit.kind === "hub"
                ? e.worldToScreen(layout.hubs[f.hit.index].x, layout.hubs[f.hit.index].y)
                : e.worldToScreen(0, 0);
          el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px) translate(-50%, -50%)`;
        });
      },
    });
    engine.names = layout.agents.map((a) => useOrgStore.getState().agents.find((x) => x.id === a.id)?.name ?? a.id);
    engineRef.current = engine;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    engine.setReducedMotion(mq.matches);
    const onMq = () => engine.setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);

    const syncFromStore = () => {
      const s = useOrgStore.getState();
      engine.setStatuses(layout.agents.map((a) => s.agents.find((x) => x.id === a.id)?.status ?? "idle"));
      engine.highlightHub = hubIdx(s.hoveredDeptId);
      engine.selectedAgent = s.selectedAgentId ? (byId.get(s.selectedAgentId) ?? -1) : -1;
      engine.lang = s.lang;
      engine.setSpotlight(s.spotlightAgentIds.map((id) => byId.get(id) ?? -1).filter((i) => i >= 0));
    };
    syncFromStore();
    engine.focus(hubIdx(useOrgStore.getState().focusDeptId));

    const unsub = useOrgStore.subscribe((s, prev) => {
      if (
        s.agents !== prev.agents ||
        s.hoveredDeptId !== prev.hoveredDeptId ||
        s.selectedAgentId !== prev.selectedAgentId ||
        s.lang !== prev.lang ||
        s.spotlightAgentIds !== prev.spotlightAgentIds
      ) {
        syncFromStore();
      }
      if (s.focusDeptId !== prev.focusDeptId) engine.focus(hubIdx(s.focusDeptId));
      if (s.resetNonce !== prev.resetNonce) engine.resetView();
    });

    const offSim = simEvents.on((ev) => {
      const i = byId.get(ev.agentId);
      if (i === undefined) return;
      if (ev.type === "kb-read") engine.emitKbRead(i);
      else engine.emitTaskFlow(i, ev.direction);
    });

    const ro = new ResizeObserver(() => engine.resize(wrap.clientWidth, wrap.clientHeight));
    ro.observe(wrap);
    engine.resize(wrap.clientWidth, wrap.clientHeight);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = canvas.getBoundingClientRect();
      engine.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
      useOrgStore.getState().setAutoTour(false);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });

    engine.start();
    return () => {
      engine.destroy();
      unsub();
      offSim();
      ro.disconnect();
      mq.removeEventListener("change", onMq);
      canvas.removeEventListener("wheel", onWheel);
      engineRef.current = null;
    };
  }, [layout, focusables]);

  useEffect(() => {
    engineRef.current?.setInsets(insetLeft, insetTop, insetRight, insetBottom);
  }, [insetLeft, insetTop, insetRight, insetBottom]);

  /* ------------------------------ pointer ------------------------------ */
  const drag = useRef<{ x: number; y: number; moved: boolean; id: number } | null>(null);

  const local = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 4) {
        d.moved = true;
        canvasRef.current!.setPointerCapture(d.id);
        useOrgStore.getState().setAutoTour(false);
      }
      if (d.moved) {
        engine.panBy(dx, dy);
        d.x = e.clientX;
        d.y = e.clientY;
        return;
      }
    }
    const [x, y] = local(e);
    const hit = engine.hitTest(x, y);
    setHoverHit(hit);
    canvasRef.current!.style.cursor = hit ? "pointer" : "grab";
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.moved || !engineRef.current) return;
    const [x, y] = local(e);
    activate(engineRef.current.hitTest(x, y));
  };

  /* ------------------------------ keyboard ----------------------------- */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const engine = engineRef.current;
    if (!engine) return;
    const cx = insetLeft + (engine.width - insetLeft - insetRight) / 2;
    const cy = insetTop + (engine.height - insetTop - insetBottom) / 2;
    const step = e.shiftKey ? 160 : 60;
    switch (e.key) {
      case "+":
      case "=":
        engine.zoomAt(cx, cy, 1.25);
        break;
      case "-":
      case "_":
        engine.zoomAt(cx, cy, 0.8);
        break;
      case "0":
        useOrgStore.getState().focusDept(null);
        engine.resetView();
        break;
      case "ArrowLeft":
        engine.panBy(step, 0);
        break;
      case "ArrowRight":
        engine.panBy(-step, 0);
        break;
      case "ArrowUp":
        engine.panBy(0, step);
        break;
      case "ArrowDown":
        engine.panBy(0, -step);
        break;
      case "Escape":
        if (useOrgStore.getState().selectedAgentId) return;
        useOrgStore.getState().focusDept(null);
        engine.resetView();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const zoomButton = (factor: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.zoomAt(insetLeft + (engine.width - insetLeft - insetRight) / 2, insetTop + (engine.height - insetTop - insetBottom) / 2, factor);
  };

  /* ------------------------------ tooltip ------------------------------ */
  let tip: React.ReactNode = null;
  if (hover?.kind === "agent") {
    const a = agents.find((x) => x.id === layout.agents[hover.index].id);
    if (a) {
      tip = (
        <>
          <div className="text-[13px] font-semibold text-white">{a.name}</div>
          <div className="text-[11px] text-white/60">{tx(a.role)}</div>
          <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-orange-300">{t(`auto.${a.automationLevel}`)}</span>
            <span className="text-white/30">·</span>
            <span className={a.status === "blocked" ? "text-red-400" : a.status === "working" ? "text-amber-200" : "text-white/50"}>
              {t(`status.${a.status}`)}
            </span>
          </div>
        </>
      );
    }
  } else if (hover?.kind === "hub") {
    const d = departments[hover.index];
    tip = (
      <>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: d.color }}>
          {tx(d.name)}
        </div>
        <div className="text-[11px] text-white/60">{t("map.hubHint", { n: d.agents.length })}</div>
      </>
    );
  } else if (hover?.kind === "core") {
    tip = (
      <>
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300">{tx(KNOWLEDGE_CORE_LABEL)}</div>
        <div className="text-[11px] text-white/60">{t("map.coreHint", { n: agents.length })}</div>
      </>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="noise absolute inset-0 overflow-hidden bg-[#07070a] outline-none"
      onKeyDown={onKeyDown}
      role="application"
      aria-label={t("map.aria")}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none"
        style={{ cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          if (!drag.current) setHoverHit(null);
        }}
        onDoubleClick={() => {
          useOrgStore.getState().focusDept(null);
          engineRef.current?.resetView();
        }}
      />

      {/* Invisible, focusable proxies so every node is reachable by keyboard and screen reader. */}
      <div className="pointer-events-none absolute inset-0">
        {focusables.map((f, i) => (
          <button
            key={i}
            ref={(el) => {
              focusBtnRefs.current[i] = el;
            }}
            type="button"
            aria-label={focusLabel(f.hit)}
            className="map-focus absolute left-0 top-0 rounded-full"
            style={{
              width: f.hit.kind === "agent" ? 22 : f.hit.kind === "hub" ? 70 : 100,
              height: f.hit.kind === "agent" ? 22 : f.hit.kind === "hub" ? 70 : 100,
            }}
            onFocus={() => setHoverHit(f.hit)}
            onBlur={() => setHoverHit(null)}
            onClick={() => activate(f.hit)}
          />
        ))}
      </div>

      <div
        ref={tooltipRef}
        className="pointer-events-none absolute left-0 top-0 z-10"
        style={{ opacity: tip ? 1 : 0, transition: "opacity 120ms" }}
        aria-hidden
      >
        <div className="glass ml-4 mt-4 min-w-[170px] rounded-lg px-3 py-2">{tip}</div>
      </div>

      {/* Legend */}
      <div
        className="pointer-events-none absolute bottom-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45"
        style={{ left: insetLeft + 20 }}
      >
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-[#ffe6cf] shadow-[0_0_8px_#ff8a3d]" /> {t("map.working")}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-[#ff6a1f]/80" /> {t("map.idle")}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-2 w-2 rounded-full bg-[#ff4a3a] ring-1 ring-red-500/70 ring-offset-1 ring-offset-black" /> {t("map.blocked")}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-[#ffb020] shadow-[0_0_6px_#ffb020]" /> {t("map.kbRead")}
        </span>
      </div>

      <div className="absolute bottom-4 flex items-center gap-3 transition-[right] duration-300" style={{ right: insetRight + 16 }}>
        <span
          ref={statsRef}
          className={`font-mono text-[10px] uppercase tracking-[0.16em] text-white/35 ${showHud ? "" : "hidden"}`}
          aria-hidden
        />
        <div className="glass flex overflow-hidden rounded-full">
          <button type="button" className="map-ctl" onClick={() => zoomButton(1.25)} aria-label={t("map.zoomIn")}>
            <Plus size={14} />
          </button>
          <button type="button" className="map-ctl" onClick={() => zoomButton(0.8)} aria-label={t("map.zoomOut")}>
            <Minus size={14} />
          </button>
          <button
            type="button"
            className="map-ctl"
            onClick={() => {
              useOrgStore.getState().focusDept(null);
              engineRef.current?.resetView();
            }}
            aria-label={t("map.fit")}
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
