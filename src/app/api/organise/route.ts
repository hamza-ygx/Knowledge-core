import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { combineText, extractFiles, MAX_FILES, MAX_TOTAL_BYTES, type ExtractedFile } from "@/lib/organiser/extract";
import { OrganiseResult, SYSTEM_PROMPT, type OrganiseResultT } from "@/lib/organiser/prompt";
import type { Json } from "@/lib/supabase/database.types";
import { allowedEmails } from "@/lib/supabase/env";
import { serverSupabase } from "@/lib/supabase/server";

// Organising can take a while on a big dump.
export const maxDuration = 300;

const MODEL = "claude-opus-5";
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);

type Db = Awaited<ReturnType<typeof serverSupabase>>;

/**
 * POST multipart/form-data: text, links, files[], agentId?  → new intake, organised now if a key is set.
 * POST application/json: { intakeId, agentId? }             → organise an intake that is still pending.
 */
export async function POST(request: Request) {
  const db = await serverSupabase();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || !allowedEmails().includes((user.email ?? "").toLowerCase())) return json({ error: "Sign in first." }, 401);

  let intakeId: string;
  let material: string;
  let pdfs: ExtractedFile[] = [];
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
    pdfs = extracted.filter((f) => f.kind === "pdf");
    material = combineText(text, links, extracted);

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

  return organise(db, { intakeId, material, pdfs, agentId });
}

async function organise(db: Db, job: { intakeId: string; material: string; pdfs: ExtractedFile[]; agentId: string | null }) {
  const started = Date.now();
  await db.from("intakes").update({ status: "processing", error: null }).eq("id", job.intakeId);

  // Record the work as a run of the organiser agent so it shows on the map and in Runs.
  let runId: string | null = null;
  if (job.agentId) {
    const { data } = await db
      .from("runs")
      .insert({ agent_id: job.agentId, status: "running", summary: "Organising projects" })
      .select("id")
      .single();
    runId = data?.id ?? null;
    if (runId) await db.from("agents").update({ status: "working", last_run_at: new Date().toISOString() }).eq("id", job.agentId);
  }

  const finish = async (ok: boolean, summary: string, output?: Json, error?: string) => {
    await db
      .from("intakes")
      .update({ status: ok ? "done" : "failed", summary: clip(summary, 4000), error: error ? clip(error, 4000) : null, processed_at: new Date().toISOString() })
      .eq("id", job.intakeId);
    if (runId && job.agentId) {
      await db
        .from("runs")
        .update({
          status: ok ? "succeeded" : "failed",
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - started,
          summary: clip(summary, 2000),
          output: output ?? null,
          error: error ? clip(error, 5000) : null,
        })
        .eq("id", runId);
      await db.from("agents").update({ status: ok ? "idle" : "blocked" }).eq("id", job.agentId);
    }
  };

  try {
    const { data: existing } = await db
      .from("projects")
      .select("id, name, status, priority, summary, current_work, next_steps, location, links, target, notes");

    const content: Anthropic.Beta.BetaContentBlockParam[] = [
      ...job.pdfs.map(
        (p): Anthropic.Beta.BetaContentBlockParam => ({
          type: "document",
          title: p.name,
          source: { type: "base64", media_type: "application/pdf", data: p.pdfBase64! },
        }),
      ),
      {
        type: "text",
        text: `Current project register (JSON):\n${JSON.stringify(existing ?? [])}\n\nNew material to organise:\n\n${job.material}`,
      },
    ];

    const client = new Anthropic({ timeout: 280_000, maxRetries: 1 });
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
      output_config: { effort: "medium", format: betaZodOutputFormat(OrganiseResult) },
      // If Claude declines, the API retries on its recommended fallback model instead of failing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    if (response.stop_reason === "refusal") throw new Error("Claude declined to process this material.");
    if (response.stop_reason === "max_tokens") throw new Error("The material was too large to organise in one go. Split it up.");
    const result = response.parsed_output;
    if (!result) throw new Error("Claude's answer could not be read.");

    const { created, updated } = await applyResult(db, result, job.intakeId, existing?.map((p) => p.id) ?? []);
    const summary = `${result.summary} (${created} new, ${updated} updated)`;
    const usage = { model: response.model, input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens };
    await finish(true, result.unsorted.length ? `${summary}\n\nCouldn't place:\n- ${result.unsorted.join("\n- ")}` : summary, {
      created,
      updated,
      unsorted: result.unsorted,
      usage,
    } as Json);

    return json({ ok: true, intakeId: job.intakeId, summary: result.summary, created, updated, unsorted: result.unsorted }, 200);
  } catch (err) {
    const message =
      err instanceof Anthropic.AuthenticationError
        ? "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in Vercel."
        : err instanceof Anthropic.RateLimitError
          ? "Claude is rate limited right now. Try again in a minute."
          : err instanceof Anthropic.APIError
            ? `Claude API error (${err.status}): ${err.message}`
            : err instanceof Error
              ? err.message
              : "Unknown error";
    await finish(false, "Organising failed", undefined, message);
    return json({ error: message, intakeId: job.intakeId }, 502);
  }
}

async function applyResult(db: Db, result: OrganiseResultT, intakeId: string, existingIds: string[]) {
  let created = 0;
  let updated = 0;
  const known = new Set(existingIds);
  const { data: last } = await db.from("projects").select("position").order("position", { ascending: false }).limit(1);
  let position = (last?.[0]?.position ?? 0) + 1000;

  for (const p of result.projects) {
    const row = {
      name: clip(p.name.trim() || "Untitled project", 120),
      status: p.status,
      priority: p.priority,
      summary: clip(p.summary, 2000),
      current_work: clip(p.current_work, 2000),
      next_steps: p.next_steps.slice(0, 30).map((s) => clip(s, 300)),
      location: clip(p.location, 500),
      links: p.links.slice(0, 30).map((s) => clip(s, 500)),
      target: clip(p.target, 120),
      notes: clip(p.notes, 5000),
      last_intake_id: intakeId,
      updated_at: new Date().toISOString(),
    };
    if (p.existing_id && known.has(p.existing_id)) {
      const { error } = await db.from("projects").update(row).eq("id", p.existing_id);
      if (!error) updated++;
    } else {
      const { error } = await db.from("projects").insert({ ...row, position });
      position += 1000;
      if (!error) created++;
    }
  }
  return { created, updated };
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
