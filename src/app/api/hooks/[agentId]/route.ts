import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { Database, Json } from "@/lib/supabase/database.types";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

const MAX_BODY = 64 * 1024;

const Event = z.object({
  event: z.enum(["started", "succeeded", "failed"]),
  run_id: z.string().min(1).max(200).optional(),
  summary: z.string().max(2000).optional(),
  error: z.string().max(5000).optional(),
  output: z.json().optional(),
  timestamp: z.iso.datetime({ offset: true }).optional(),
});

/**
 * Agents report runs here: POST /api/hooks/<agentId> with "Authorization: Bearer <token>".
 * The token is checked inside the database (ingest_run), which only stores its sha256.
 */
export async function POST(request: Request, ctx: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await ctx.params;
  if (!z.uuid().safeParse(agentId).success) return json({ error: "unknown agent" }, 404);

  const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return json({ error: "missing bearer token" }, 401);

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ error: "body larger than 64 KB" }, 413);

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }
  const parsed = Event.safeParse(body);
  if (!parsed.success) return json({ error: "invalid event", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);

  const db = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("ingest_run", { p_agent_id: agentId, p_token: token, p_event: parsed.data as Json });
  if (error) {
    if (error.code === "28000" || error.message === "unauthorized") return json({ error: "unauthorized" }, 401);
    if (error.code === "22023") return json({ error: error.message }, 400);
    return json({ error: "could not record the run" }, 500);
  }
  return json({ ok: true, ...(data as object) }, 200);
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
