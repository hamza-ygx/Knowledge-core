import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { costOf, DEFAULT_BUDGET_USD, DEFAULT_MODEL, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS, usd } from "@/lib/organiser/cost";
import { combineText, extractFiles, MAX_FILES, MAX_TOTAL_BYTES } from "@/lib/organiser/extract";
import { compactRegister, OrganiseResult, SYSTEM_PROMPT, type OrganiseResultT } from "@/lib/organiser/prompt";
import type { Database, Json } from "@/lib/supabase/database.types";
import { allowedEmails } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

export const maxDuration = 120;

const MODEL = process.env.ORGANISER_MODEL || DEFAULT_MODEL;
const BUDGET = Number(process.env.ORGANISER_BUDGET_USD) || DEFAULT_BUDGET_USD;
// Server-side refusal fallbacks and effort only exist on the larger models.
const LARGE_MODEL = /^claude-(opus-5|fable-5|mythos-5)/.test(MODEL);

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

type Db = Awaited<ReturnType<typeof serverSupabase>>;

async function signedIn() {
  const db = await serverSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  const ok = !!user && allowedEmails().includes((user.email ?? "").toLowerCase());
  return { db, ok };
}

async function spentSoFar(db: Db): Promise<number> {
  const { data } = await db.from("intakes").select("cost_usd");
  return (data ?? []).reduce((sum, r) => sum + Number(r.cost_usd ?? 0), 0);
}

/** GET → budget status for the inbox. */
export async function GET() {
  const { db, ok } = await signedIn();
  if (!ok) return json({ error: "Sign in first." }, 401);
  return json({ model: MODEL, budget: BUDGET, spent: await spentSoFar(db), enabled: !!process.env.ANTHROPIC_API_KEY }, 200);
}

/**
 * POST multipart/form-data: text, links, files[], agentId?  → new intake, organised now if a key is set.
 * POST application/json: { intakeId, agentId? }             → organise an intake that is still pending.
 */
export async function POST(request: Request) {
  const { db, ok } = await signedIn();
  if (!ok) return json({ error: "Sign in first." }, 401);

  let intakeId: string;
  let material: string;
  let agentId: string | null = null;

  if ((request.headers.get("content-type") ?? "").includes("application/json")) {
    const body = z.object({ intakeId: z.uuid(), agentId: z.uuid().nullish() }).safeParse(await request.json().catch(() => null));
    if (!body.success) return json({ error: "Invalid request." }, 400);
    const { data: intake } = await db.from("intakes").select("*").eq("id", body.data.intakeId).single();
    if (!intake) return json({ error: "Intake not found." }, 404);
    intakeId = intake.id;
    material = intake.text;
    agentId = body.data.agentId ?? null;
  } else {
    const form = await request.formData().catch(() => null);
    if (!form) return json({ error: "Invalid form." }, 400);
    const text = String(form.get("text") ?? "");
    const links = String(form.get("links") ?? "");
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const parsedAgent = z.uuid().safeParse(form.get("agentId"));
    agentId = parsedAgent.success ? parsedAgent.data : null;

    if (files.length > MAX_FILES) return json({ error: `At most ${MAX_FILES} files at a time.` }, 400);
    if (files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL_BYTES) return json({ error: "Files are larger than 4 MB in total." }, 413);
    if (!text.trim() && !links.trim() && !files.length) return json({ error: "Give Organiser something to sort." }, 400);

    const extracted = await extractFiles(files);
    material = combineText(text, links, extracted);
    if (!material.trim()) return json({ error: "None of the files contained readable text." }, 400);
    if (material.length > MAX_INPUT_CHARS) {
      return json(
        { error: `That's ${material.length.toLocaleString()} characters; the limit per run is ${MAX_INPUT_CHARS.toLocaleString()} to keep costs down. Split it into smaller batches.` },
        413,
      );
    }

    const { data: intake, error } = await db
      .from("intakes")
      .insert({
        text: material,
        links: clip(links, 20000),
        files: extracted.map(({ name, size, kind, note }) => ({ name, size, kind, note: note ?? null })) as Json,
        status: "pending",
      })
      .select()
      .single();
    if (error || !intake) return json({ error: "Could not save the material." }, 500);
    intakeId = intake.id;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return json({ queued: true, intakeId, message: "Saved to the inbox. Add ANTHROPIC_API_KEY in Vercel to organise automatically." }, 202);
  }

  const spent = await spentSoFar(db);
  if (spent >= BUDGET) {
    return json(
      { queued: true, intakeId, message: `Budget reached (${usd(spent)} of ${usd(BUDGET)}). Saved to the inbox; raise ORGANISER_BUDGET_USD to continue.` },
      402,
    );
  }

  return organise(db, { intakeId, material, agentId });
}

async function organise(db: Db, job: { intakeId: string; material: string; agentId: string | null }) {
  const started = Date.now();
  await db.from("intakes").update({ status: "processing", error: null }).eq("id", job.intakeId);

  // Record the work as a run of the organiser agent so it shows on the map and in Runs.
  let runId: string | null = null;
  if (job.agentId) {
    const { data } = await db.from("runs").insert({ agent_id: job.agentId, status: "running", summary: "Organising projects" }).select("id").single();
    runId = data?.id ?? null;
    if (runId) await db.from("agents").update({ status: "working", last_run_at: new Date().toISOString() }).eq("id", job.agentId);
  }

  let usage = { input_tokens: 0, output_tokens: 0 };
  const finish = async (ok: boolean, summary: string, output?: Json, error?: string) => {
    const cost = costOf(MODEL, usage.input_tokens, usage.output_tokens);
    await db
      .from("intakes")
      .update({
        status: ok ? "done" : "failed",
        summary: clip(summary, 4000),
        error: error ? clip(error, 4000) : null,
        processed_at: new Date().toISOString(),
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        cost_usd: Number(cost.toFixed(6)),
        model: MODEL,
      })
      .eq("id", job.intakeId);
    if (runId && job.agentId) {
      await db
        .from("runs")
        .update({
          status: ok ? "succeeded" : "failed",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - started,
          summary: clip(summary, 2000),
          output: { ...((output as object) ?? {}), model: MODEL, ...usage, cost_usd: Number(cost.toFixed(6)) } as Json,
          error: error ? clip(error, 5000) : null,
        })
        .eq("id", runId);
      await db.from("agents").update({ status: ok ? "idle" : "blocked" }).eq("id", job.agentId);
    }
    return cost;
  };

  try {
    const { data: existing } = await db
      .from("projects")
      .select("id, name, status, priority, summary, current_work, next_steps, location, target, links, notes");

    const client = new Anthropic({ timeout: 110_000, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Register:\n${compactRegister(existing ?? [])}\n\nNew material:\n${job.material}`,
        },
      ],
      output_config: { format: betaZodOutputFormat(OrganiseResult), ...(LARGE_MODEL ? { effort: "medium" as const } : {}) },
      // On the larger models, a declined request is retried on Anthropic's recommended fallback model.
      ...(LARGE_MODEL ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    usage = { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };

    if (response.stop_reason === "refusal") throw new Error("Claude declined to process this material.");
    if (response.stop_reason === "max_tokens") throw new Error("Too much to organise in one go. Split it into smaller batches.");
    const result = response.parsed_output;
    if (!result) throw new Error("Claude's answer could not be read.");

    const { created, updated } = await applyResult(db, result, job.intakeId, existing ?? []);
    const text = `${result.summary} (${created} new, ${updated} updated)`;
    const cost = await finish(true, result.unsorted.length ? `${text}\n\nCouldn't place:\n- ${result.unsorted.join("\n- ")}` : text, {
      created,
      updated,
      unsorted: result.unsorted,
    } as Json);

    return json({ ok: true, intakeId: job.intakeId, summary: result.summary, created, updated, unsorted: result.unsorted, costUsd: cost }, 200);
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Vercel."
        : err instanceof Anthropic.RateLimitError
          ? "Claude is rate limited right now. Try again in a minute."
          : err instanceof Anthropic.APIError && /credit balance/i.test(err.message)
            ? "Your Anthropic credit has run out. Top up at console.anthropic.com."
            : err instanceof Anthropic.APIError
              ? `Claude API error (${err.status}): ${err.message}`
              : err instanceof Error
                ? err.message
                : "Unknown error";
    await finish(false, "Organising failed", undefined, message);
    return json({ error: message, intakeId: job.intakeId }, 502);
  }
}

type ExistingRow = { id: string; name: string; links: string[] };

async function applyResult(db: Db, result: OrganiseResultT, intakeId: string, existing: ExistingRow[]) {
  let created = 0;
  let updated = 0;
  const byId = new Map(existing.map((p) => [p.id, p]));
  const { data: last } = await db.from("projects").select("position").order("position", { ascending: false }).limit(1);
  let position = (last?.[0]?.position ?? 0) + 1000;
  const now = new Date().toISOString();

  for (const p of result.projects) {
    // Only the fields Claude sent; null means "keep".
    const patch: Database["public"]["Tables"]["projects"]["Update"] = { last_intake_id: intakeId, updated_at: now };
    if (p.name !== null && p.name.trim()) patch.name = clip(p.name.trim(), 120);
    if (p.status !== null) patch.status = p.status;
    if (p.priority !== null) patch.priority = p.priority;
    if (p.summary !== null) patch.summary = clip(p.summary, 2000);
    if (p.current_work !== null) patch.current_work = clip(p.current_work, 2000);
    if (p.next_steps !== null) patch.next_steps = p.next_steps.slice(0, 30).map((s) => clip(s, 300));
    if (p.location !== null) patch.location = clip(p.location, 500);
    if (p.target !== null) patch.target = clip(p.target, 120);
    if (p.notes !== null) patch.notes = clip(p.notes, 5000);

    const current = p.existing_id ? byId.get(p.existing_id) : undefined;
    const newLinks = p.add_links.map((l) => clip(l.trim(), 500)).filter(Boolean);

    if (current) {
      if (newLinks.length) patch.links = [...new Set([...current.links, ...newLinks])].slice(0, 30);
      const { error } = await db.from("projects").update(patch).eq("id", current.id);
      if (!error) updated++;
    } else {
      const { error } = await db.from("projects").insert({
        ...patch,
        name: patch.name ?? "Untitled project",
        links: newLinks.slice(0, 30),
        position,
      });
      position += 1000;
      if (!error) created++;
    }
  }
  return { created, updated };
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
