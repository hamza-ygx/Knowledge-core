# Agent Org Map

A visual control room for a company run by AI agents. It shows 37 agents in 6 departments, all connected to one shared **Knowledge Core**.

It is set up as an **event demo**: a fictional company ("Exempelbolaget AB" / "Example Co."), placeholder customer names ("Demo Bygg AB" and so on), Swedish and English with Swedish as the default, and a scripted "Ask the Knowledge Core" sequence. All data is simulated.

Stack: Next.js (App Router), TypeScript, Tailwind CSS v4, d3-force, Framer Motion, Zustand and dnd-kit. There is no backend. A client-side tick loop simulates the live activity.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Views

| View | What it does |
| --- | --- |
| **Map** | A radial galaxy on `<canvas>`. Pan and zoom, click a hub to drill in, hover agents for tooltips. Live particles show tasks and knowledge-base reads. |
| **Org** | A per-department org chart built from `reportsTo`, with a department picker. Connectors animate while an agent is working. |
| **Kanban** | One board across all departments, with filter chips. The simulator moves a task every 2–4 s and a moved card flashes. You can drag cards (dnd-kit) or move a focused card with `←`/`→`. |
| **Agents** | A searchable table of all agents (search matches name, role, department and tools). Sort by name, department, automation, status or open tasks. |

Clicking a department in the side panel scopes the current view to it: the map zooms in, and the Org, Kanban and Agents views filter to that department.

Clicking an agent opens the **Agent drawer** from the right. It shows the agent's details, automation level, process stepper, tools, tasks and activity log.

### Ask the Knowledge Core

The glowing **Fråga kunskapskärnan / Ask the Knowledge Core** button on the map (or `K`) opens a panel with preset questions. Picking one plays a short sequence:
1. The question travels from the core out to the agents involved.
2. Each agent lights up in turn and reads the knowledge base, while the rest of the map dims.
3. Everything streams back into the core, and the answer is typed out with its sources and the agents involved.

The questions, steps, answers and sources live in `src/data/askCore.ts`.

### Presenting at an event

| Key | Action |
| --- | --- |
| `1`–`4` | Switch views (`←`/`→` also move between the view tabs) |
| `K` | Open Ask the Knowledge Core |
| `L` | Switch language SV ⇄ EN (also the SV/EN switch in the top bar) |
| `P` | Pause or resume the simulation |
| `F` | Fullscreen |
| `D` | Show or hide the FPS and particle counter |
| `Esc` | Close the drawer or the Ask panel, or reset the map camera |

On the map, `Tab` moves through core → hubs → agents and `Enter` opens the focused node. `+`/`-` zoom, the arrow keys pan (hold `Shift` for bigger steps), and `0` resets the camera.

**Booth mode:** after 90 seconds without mouse or keyboard input, the demo closes any open panels, goes back to the map and starts Auto tour. Change `IDLE_MS` in `components/shell/AppShell.tsx` to adjust the delay. The chosen language is remembered in the browser.

## Project structure

```
src/
  app/                 layout, fonts, global styles
  data/
    types.ts           Department / Agent / Task types
    org.ts             ← the seed file you edit
    askCore.ts         ← scripted "Ask the Knowledge Core" questions
  i18n/                SV/EN: l("English", "Svenska") helper + UI dictionary
  store/
    useOrgStore.ts     Zustand store (agents, tasks, activity, UI state)
    simulator.ts       live tick loop + auto tour
    events.ts          effect bus (map particles) that never triggers React renders
  lib/metrics.ts       automation score
  components/
    map/               layout.ts (d3-force, precomputed), engine.ts (canvas renderer), MapView.tsx
    panel/             left side panel
    drawer/            agent drawer
    shell/             top bar, app shell
    org/               OrgView (tidy tree + SVG connectors)
    kanban/            KanbanView (dnd-kit + Framer Motion layout animations)
    agents/            AgentsView (search, sort, filter)
    ask/               Ask the Knowledge Core button + panel
    ui/                shared badges and department chips
```

## Editing `org.ts` to model your own company

Everything the UI shows comes from `src/data/org.ts`. The UI adapts to any number of departments and agents: the map spaces hubs evenly around the ring, and the force layout places agents around their hub.

All visible text is bilingual. Write it as `l("English", "Svenska")`. Agent names such as "Vega" are the same in both languages, so they are plain strings. Button and label text lives in `src/i18n/index.ts`.

### Departments

```ts
export const departments: Department[] = [
  { id: "sales", name: l("Sales", "Försäljning"), subtitle: l("conversations & deals", "samtal & affärer"), color: "#ff6a1f", agents: sales },
  // ...
];
```

- The order of this array is the clockwise order around the map.
- `color` is used for the hub, the agent dots, the panel row and the Kanban cards. Keep it in the warm orange/red/amber family so it matches the theme.

### Agents

Each department's agents are defined with the `agents(departmentId, [...])` helper:

```ts
{
  id: "vega",                    // unique, used by reportsTo and tasks
  name: "Vega",
  role: l("Account Executive", "Kundansvarig säljare"),
  reportsTo: "atlas",            // another agent's id, or null for the department lead
  automationLevel: level.part,   // level.doc | level.part | level.full
  status: "working",             // optional starting status: idle (default) | working | blocked
  tools: ["HubSpot", "Outlook"], // see ToolName in types.ts
  process: [
    auto("Prepare call brief from the knowledge base", "Förbereder samtalsunderlag från kunskapsbasen"),
    manual("Run discovery call", "Håller behovsanalysmöte"),
  ],
}
```

- Give each department **one lead** (`reportsTo: null`). Every other agent reports to the lead or to another agent in the same department. The Org chart builds its tree from these links.
- Use `auto(en, sv)` and `manual(en, sv)` to mark each process step. The drawer shows the steps as a stepper.
- `automationLevel` feeds the "Runs without you" score: `fully = 1`, `partly = 0.5`, `documented = 0`, averaged across all agents.
- To add a tool, add its name to `ToolName` in `types.ts` and map it to a generic icon in `components/drawer/toolIcons.tsx`.

### Tasks

```ts
t("Proposal: annual service agreement", "Offert: årligt serviceavtal", "quill", "todo")
```

`t(english, swedish, agentId, column)`. The department comes from the agent. The column is one of `backlog | todo | in_progress | review | done`.

### Simulation text

- `knowledgeTopics[departmentId]`: what agents in that department "look up" when they read the knowledge base. These appear in the activity log.
- `taskTemplates[departmentId]`: titles for tasks the simulator creates. `{client}` is replaced with a random entry from `clientNames`.
- `blockReasons`: why an agent becomes blocked.
- `COMPANY_NAME`, `COMPANY_TAGLINE`, `PRESENTED_BY` and `KNOWLEDGE_CORE_LABEL` set the panel header, the presenter credit in the top bar and the core label.
- Keep customer names obviously fictional (`clientNames`) so the demo never looks like it shows a real company's data.

## Performance notes

- The layout is computed once with d3-force (a seeded, deterministic run of 400 ticks).
- The canvas engine keeps its particles in typed arrays (struct of arrays) with no per-frame allocations. Glows are pre-rendered sprites drawn with `globalCompositeOperation = "lighter"`. The starfield is rendered once for each resize.
- The simulator emits visual effects through `store/events.ts`, so particle bursts never cause React re-renders.
- With `prefers-reduced-motion`, the map runs about 140 slower particles, turns off drift and camera easing, and slows the simulator.
