# Agent Org Map

A working control room for your own AI agents and automations. Use it to:

- **Plan automation.** Map your departments and agents, and list each agent's process steps. Mark each step as manual or automated to get a real "Runs without you" percentage.
- **Track work.** Keep a task board. Any manual step can become an "Automate: …" task in one click.
- **Monitor runs.** Every agent gets a webhook. Scripts, Power Automate, Zapier or GitHub Actions report when a run starts, succeeds or fails. The Runs view and the map update live.

The simulated event demo lives on the **`event-demo`** branch.

Stack: Next.js 16 (App Router), TypeScript, Tailwind v4, Supabase (Postgres, Auth and Realtime), d3-force + canvas for the map, Framer Motion, Zustand and dnd-kit.

## Setup

1. **Supabase.** Create a project and apply the migrations in `supabase/migrations/` in order.
2. **Env vars.** Copy `.env.example` to `.env.local` and fill it in. Add the same three variables in Vercel under Project → Settings → Environment Variables.
3. **Create your account.** No email is ever sent, so company mail filters don't matter.
   - Supabase dashboard → **Authentication → Users → Add user → Create new user**. Enter your email and a strong password, and tick **Auto Confirm User**.
   - Then open **Authentication → Sign In / Providers**, keep **Email** enabled, and turn **off** "Allow new users to sign up". Your own account keeps working; nobody else can create one.
4. **Run it.**
   ```bash
   npm install
   npm run dev        # http://localhost:3000
   ```

Sign in with email and password. Only addresses listed in `ALLOWED_EMAILS` can sign in, and every failed attempt gets the same "Wrong email or password" message. To change your password, use the key button in the top bar (at least 12 characters).

## Views

| Key | View | What it does |
| --- | --- | --- |
| `1` | **Map** | The organisation as a calm radial map. The arc around each agent shows its automated share. A pulse travels out on every run start and back into the core when the run ends (red if it failed). |
| `2` | **Org** | Org chart per department, built from "reports to". Add and edit departments and agents here. The **Automation backlog** on the right lists every manual step, each with a button that creates a task. |
| `3` | **Tasks** | A board from Backlog to Done. Add, edit, assign and drag cards, or move a focused card with ← →. |
| `4` | **Runs** | A live feed of runs with per-agent stats: 7-day success rate, run count and average duration. Click a row to see the summary, error and output. |

Click an agent anywhere to open its panel. There you can edit its details and process steps, see its open tasks, and manage its webhook. `D` shows an FPS counter on the map.

## Reporting runs from an agent

In the agent panel, click **Connect webhook**. It creates a token that is **shown once**. Only its SHA-256 hash is stored.

```bash
curl -X POST https://YOUR-DOMAIN/api/hooks/AGENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event":"started","run_id":"run-123"}'

curl -X POST https://YOUR-DOMAIN/api/hooks/AGENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event":"succeeded","run_id":"run-123","summary":"Sent 4 invoices","output":{"count":4}}'
```

| Field | Required | Notes |
| --- | --- | --- |
| `event` | yes | `started`, `succeeded` or `failed` |
| `run_id` | no | Use the same id for start and finish; the duration is then calculated |
| `summary` | no | Up to 2,000 characters |
| `error` | no | Up to 5,000 characters, shown in red |
| `output` | no | Any JSON; the whole request body is capped at 64 KB |
| `timestamp` | no | ISO 8601 with a timezone; defaults to now |

The endpoint returns:

| Status | Meaning |
| --- | --- |
| `200` | Recorded |
| `400` | Invalid body |
| `401` | Wrong or missing token |
| `404` | Unknown agent id |
| `413` | Body over 64 KB |

The agent's status on the map follows its runs:

| Latest event | Status |
| --- | --- |
| started | running |
| succeeded | idle |
| failed | failed |

**Test run** and **Test failure** in the agent panel simulate a run without a real agent.

## Security model

- **Row level security** is on every table: a signed-in user only ever sees and changes their own rows. Composite foreign keys also stop one user's rows from pointing at another user's data.
- **Webhook writes** go through the `ingest_run` Postgres function (`security definer`, fixed `search_path`). It checks the token hash before touching any data, so no service-role key exists anywhere in the app.
- The **publishable key** is the only key the app needs, and it's safe to expose.
- **Webhook bodies** are validated with zod and capped at 64 KB.

## Project structure

```
src/
  proxy.ts                    session refresh + sign-in redirect (Next 16 "proxy")
  app/
    page.tsx                  signed-in app
    login/                    email + password sign-in (allowlist) and sign-out
    api/hooks/[agentId]/      webhook endpoint
  lib/
    supabase/                 browser/server clients, env, generated DB types
    metrics.ts                automation score, ordering helpers
  store/
    useOrgStore.ts            data + UI state, instant local updates, realtime sync
    events.ts                 run pulses for the map (no React renders)
  components/
    map/                      d3-force layout + canvas engine
    org/                      org chart, backlog, create/edit dialogs
    drawer/                   agent panel: details, process steps, webhook
    tasks/  runs/  panel/  onboarding/  shell/  ui/
supabase/migrations/          schema, RLS, ingest_run
```
