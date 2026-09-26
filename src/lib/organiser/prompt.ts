import { z } from "zod";

export const PROJECT_STATUSES = ["live", "active", "upcoming", "idea", "paused", "done"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;

// A patch format: null means "leave as it is". Claude only writes what changes, which keeps
// output tokens (the expensive ones) down. Kept free of length limits; lengths are enforced on save.
export const OrganiseResult = z.object({
  summary: z.string().describe("One short sentence on what you did."),
  projects: z.array(
    z.object({
      existing_id: z.string().nullable().describe("id from the register when updating a project; null for a new project"),
      name: z.string().nullable().describe("Required for new projects; null to keep an existing name"),
      status: z.enum(PROJECT_STATUSES).nullable(),
      priority: z.enum(PRIORITIES).nullable(),
      summary: z.string().nullable().describe("One short sentence"),
      current_work: z.string().nullable(),
      next_steps: z.array(z.string()).nullable().describe("Full replacement list, or null to keep the current one"),
      location: z.string().nullable(),
      add_links: z.array(z.string()).describe("New URLs only; [] if none"),
      target: z.string().nullable(),
      notes: z.string().nullable(),
    }),
  ),
  unsorted: z.array(z.string()).describe("Short fragments that fit no project; [] if none"),
});

export type OrganiseResultT = z.infer<typeof OrganiseResult>;

export const SYSTEM_PROMPT = `You are Project Organiser. The user throws unstructured material at you (brain dumps, notes, file contents, GitHub links) and you keep their project register up to date.

The current register is compact JSON with keys: i=id, n=name, s=status, p=priority, sum=summary, now=current work, next=next steps, loc=where it lives, t=target date.

Rules:
- One project per distinct piece of work. If material is about a project already in the register (even if named differently), update it via existing_id.
- Return only projects that are new or changed. For updates, set ONLY the fields that change and null for everything else.
- For new projects give a name and fill what the material says; use null for anything unknown.
- Status: live = launched and in use; active = being worked on now; upcoming = next in line; idea = someday; paused = on hold; done = finished.
- Priority: high if urgent, blocking or clearly important; low for nice-to-haves; else medium.
- next_steps: short actions starting with a verb, most important first, at most 5. When you change them, return the full new list.
- Never invent facts, dates, links or names. Copy URLs exactly. Put drive, folder, repo or service names in location.
- Be brief: summaries are one short sentence. Write in the material's language (Swedish or English) and keep the user's own project names.
- Fragments that fit no project go in unsorted, shortened.`;

/** The register in the compact shape the prompt describes, without empty fields. */
export function compactRegister(
  rows: { id: string; name: string; status: string; priority: string; summary: string; current_work: string; next_steps: string[]; location: string; target: string }[],
) {
  return JSON.stringify(
    rows.map((r) =>
      Object.fromEntries(
        Object.entries({ i: r.id, n: r.name, s: r.status, p: r.priority, sum: r.summary, now: r.current_work, next: r.next_steps, loc: r.location, t: r.target }).filter(
          ([, v]) => (Array.isArray(v) ? v.length > 0 : v !== ""),
        ),
      ),
    ),
  );
}
