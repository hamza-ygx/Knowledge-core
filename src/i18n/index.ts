"use client";

import { useOrgStore } from "@/store/useOrgStore";
import { l, type L, type Lang } from "./core";

export * from "./core";

const UI = {
  // top bar
  "tab.map": l("Map", "Karta"),
  "tab.org": l("Org", "Org"),
  "tab.kanban": l("Kanban", "Kanban"),
  "tab.agents": l("Agents", "Agenter"),
  autoTour: l("Auto tour", "Rundtur"),
  reset: l("Reset", "Återställ"),
  language: l("Language", "Språk"),
  demoBadge: l("Simulated demo · fictional data", "Simulerad demo · fiktiva data"),
  paused: l("Simulation paused", "Simuleringen pausad"),

  // panel
  runsWithoutYou: l("Runs without you", "Går utan dig"),
  departments: l("Departments", "Avdelningar"),
  agentsWord: l("agents", "agenter"),
  departmentsWord: l("departments", "avdelningar"),
  tasksWord: l("tasks", "uppgifter"),
  automated: l("automated", "automatiserad"),
  reads: l("reads", "läsningar"),
  sharedBy: l("shared by", "delas av"),
  collapse: l("Collapse panel", "Fäll ihop panelen"),
  expand: l("Expand panel", "Fäll ut panelen"),
  "legend.full": l("Fully", "Helt"),
  "legend.part": l("Partly", "Delvis"),
  "legend.doc": l("Documented", "Dokumenterad"),

  // automation + status
  "auto.documented": l("Documented", "Dokumenterad"),
  "auto.partly_automated": l("Partly automated", "Delvis automatiserad"),
  "auto.fully_automated": l("Fully automated", "Helt automatiserad"),
  "auto.step.documented": l("Fully documented", "Fullt dokumenterad"),
  "status.idle": l("idle", "ledig"),
  "status.working": l("working", "arbetar"),
  "status.blocked": l("blocked", "blockerad"),

  // columns
  "col.backlog": l("Backlog", "Backlogg"),
  "col.todo": l("To do", "Att göra"),
  "col.in_progress": l("In progress", "Pågår"),
  "col.review": l("Review", "Granskning"),
  "col.done": l("Done", "Klart"),

  // map
  "map.aria": l(
    "Organisation map. Tab through nodes, Enter to open. Plus and minus zoom, arrow keys pan, 0 resets.",
    "Organisationskarta. Tabba mellan noder, Enter öppnar. Plus och minus zoomar, piltangenter panorerar, 0 återställer.",
  ),
  "map.working": l("Working", "Arbetar"),
  "map.idle": l("Idle", "Ledig"),
  "map.blocked": l("Blocked", "Blockerad"),
  "map.kbRead": l("Knowledge read", "Kunskapsläsning"),
  "map.zoomIn": l("Zoom in", "Zooma in"),
  "map.zoomOut": l("Zoom out", "Zooma ut"),
  "map.fit": l("Fit whole organisation", "Visa hela organisationen"),
  "map.hubHint": l("Click to zoom into {n} agents", "Klicka för att zooma in på {n} agenter"),
  "map.coreHint": l("Shared by all {n} agents · click to reset view", "Delas av alla {n} agenter · klicka för att återställa vyn"),
  "map.hubAria": l("{name} department, {n} agents", "Avdelningen {name}, {n} agenter"),

  // drawer
  close: l("Close", "Stäng"),
  department: l("Department", "Avdelning"),
  reportsTo: l("Reports to", "Rapporterar till"),
  directReports: l("Direct reports", "Direktrapporter"),
  leadNote: l("— (department lead)", "— (avdelningschef)"),
  none: l("None", "Inga"),
  automationLevel: l("Automation level", "Automationsgrad"),
  process: l("Process", "Process"),
  automatedStep: l("Automated", "Automatiserad"),
  manualStep: l("Manual", "Manuell"),
  tools: l("Tools", "Verktyg"),
  currentTasks: l("Current tasks", "Aktuella uppgifter"),
  noOpenTasks: l("No open tasks.", "Inga öppna uppgifter."),
  activity: l("Activity", "Aktivitet"),
  waiting: l("Waiting for activity…", "Väntar på aktivitet…"),
  detailsFor: l("{name} details", "Detaljer för {name}"),

  // org
  orgChart: l("Org chart", "Organisationsschema"),
  lead: l("Lead", "Chef"),
  openTasks: l("open tasks", "öppna uppgifter"),
  task1: l("task", "uppgift"),
  taskN: l("tasks", "uppgifter"),
  openDetails: l("Open details", "Öppna detaljer"),

  // kanban
  kanbanKicker: l("Kanban · all departments", "Kanban · alla avdelningar"),
  kanbanTitle: l("Work in flight", "Pågående arbete"),
  live: l("Live", "Live"),
  kanbanHelp: l(
    "Drag cards between columns, or focus a card and use ← → to move it. Enter opens its agent.",
    "Dra kort mellan kolumner, eller markera ett kort och använd ← → för att flytta det. Enter öppnar agenten.",
  ),
  filterDept: l("Filter by department", "Filtrera på avdelning"),
  all: l("All", "Alla"),
  movedByYou: l("Moved by you", "Flyttad av dig"),

  // agents
  directory: l("Directory", "Katalog"),
  agentsTitle: l("Agents", "Agenter"),
  search: l("Search name, role, tool…", "Sök namn, roll, verktyg…"),
  searchAria: l("Search agents", "Sök agenter"),
  "th.agent": l("Agent", "Agent"),
  "th.department": l("Department", "Avdelning"),
  "th.reportsTo": l("Reports to", "Rapporterar till"),
  "th.automation": l("Automation", "Automation"),
  "th.status": l("Status", "Status"),
  "th.tasks": l("Open tasks", "Öppna uppgifter"),
  "th.tools": l("Tools", "Verktyg"),
  noMatch: l("No agents match “{q}”.", "Inga agenter matchar ”{q}”."),

  // ask the core
  askButton: l("Ask the Knowledge Core", "Fråga kunskapskärnan"),
  askTitle: l("Ask the Knowledge Core", "Fråga kunskapskärnan"),
  askIntro: l(
    "Pick a question. Watch the agents look it up in the shared knowledge base.",
    "Välj en fråga. Se hur agenterna slår upp svaret i den gemensamma kunskapsbasen.",
  ),
  askSending: l("Question sent to the Knowledge Core", "Frågan skickas till kunskapskärnan"),
  askCompiling: l("Compiling the answer", "Sammanställer svaret"),
  askAnswer: l("Answer", "Svar"),
  askSources: l("Sources", "Källor"),
  askAgents: l("Agents involved", "Inblandade agenter"),
  askAnother: l("Ask another question", "Ställ en ny fråga"),
  askTime: l("Answered in {s} s · would take a person ~{m} min", "Besvarat på {s} s · tar en människa ~{m} min"),
} satisfies Record<string, L>;

export type UIKey = keyof typeof UI;

export function translate(lang: Lang, key: UIKey, vars?: Record<string, string | number>): string {
  let s = UI[key][lang];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function useT() {
  const lang = useOrgStore((s) => s.lang);
  return {
    lang,
    t: (key: UIKey, vars?: Record<string, string | number>) => translate(lang, key, vars),
    tx: (v: L) => v[lang],
  };
}
