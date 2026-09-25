# Agent Org Map

A visual control room for a company run by AI agents. It shows 37 agents in 6 departments, all connected to one shared **Knowledge Core**.

Stack: Next.js (App Router), TypeScript, Tailwind CSS v4, d3-force, Framer Motion, Zustand and dnd-kit. There is no backend. A client-side tick loop simulates the live activity.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Views

| View | Status |
| --- | --- |
| **Map**: a radial galaxy on `<canvas>` with pan/zoom, hub drill-in, agent tooltips and live particles | ✅ |
| **Org**: a per-department org chart built from `reportsTo` | next |
| **Kanban**: one live board across all departments | next |
| **Agents**: a searchable, sortable table | next |

Clicking an agent opens the **Agent drawer** from the right. It shows the agent's details, automation level, process stepper, tools, tasks and activity log.

### Keyboard

- `1`–`4`: switch views. `←`/`→` also switch between the view tabs.
- Map: `Tab` moves through core → hub → agents. `Enter` opens the focused node. `+`/`-` zoom, the arrow keys pan (hold `Shift` for bigger steps), and `0` or `Esc` resets the camera.
- `Esc` closes the agent drawer.

## Project structure

```
src/
  app/                 layout, fonts, global styles
  data/
    types.ts           Department / Agent / Task types
    org.ts             ← the seed file you edit
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
    org/ kanban/ agents/
```

## Editing `org.ts` to model your own company

Everything the UI shows comes from `src/data/org.ts`. The UI adapts to any number of departments and agents: the map spaces hubs evenly around the ring, and the force layout places agents around their hub.

### Departments

```ts
export const departments: Department[] = [
  { id: "sales", name: "Sales", subtitle: "conversations & deals", color: "#ff6a1f", agents: sales },
  // ...
];
```

- The order of this array is the clockwise order around the map.
- `color` is used for the hub, the agent dots, the panel row and (later) the Kanban cards. Keep it in the warm orange/red/amber family so it matches the theme.

### Agents

Each department's agents are defined with the `agents(departmentId, [...])` helper:

```ts
{
  id: "vega",                    // unique, used by reportsTo and tasks
  name: "Vega",
  role: "Account Executive",
  reportsTo: "atlas",            // another agent's id, or null for the department lead
  automationLevel: level.part,   // level.doc | level.part | level.full
  status: "working",             // optional starting status: idle (default) | working | blocked
  tools: ["HubSpot", "Gmail"],   // see ToolName in types.ts
  process: [
    auto("Prepare call brief from knowledge base"),
    manual("Run discovery call"),
  ],
}
```

- Give each department **one lead** (`reportsTo: null`). Every other agent reports to the lead or to another agent in the same department. The Org chart builds its tree from these links.
- Use `auto(...)` and `manual(...)` to mark each process step. The drawer shows the steps as a stepper.
- `automationLevel` feeds the "Runs without you" score: `fully = 1`, `partly = 0.5`, `documented = 0`, averaged across all agents.
- To add a tool, add its name to `ToolName` in `types.ts` and map it to a generic icon in `components/drawer/toolIcons.tsx`.

### Tasks

```ts
t("Proposal: annual audit package", "quill", "todo")
```

`t(title, agentId, column)`. The department comes from the agent. The column is one of `backlog | todo | in_progress | review | done`.

### Simulation text

- `knowledgeTopics[departmentId]`: what agents in that department "look up" when they read the knowledge base. These appear in the activity log.
- `taskTemplates[departmentId]`: titles for tasks the simulator creates. `{client}` is replaced with a random entry from `clientNames`.
- `COMPANY_NAME` and `KNOWLEDGE_CORE_LABEL` set the panel header and the core label.

## Performance notes

- The layout is computed once with d3-force (a seeded, deterministic run of 400 ticks).
- The canvas engine keeps its particles in typed arrays (struct of arrays) with no per-frame allocations. Glows are pre-rendered sprites drawn with `globalCompositeOperation = "lighter"`. The starfield is rendered once for each resize.
- The simulator emits visual effects through `store/events.ts`, so particle bursts never cause React re-renders.
- With `prefers-reduced-motion`, the map runs about 140 slower particles, turns off drift and camera easing, and slows the simulator.
