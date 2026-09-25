import { z } from "zod";

export const PROJECT_STATUSES = ["live", "active", "upcoming", "idea", "paused", "done"] as const;
export const PRIORITIES = ["high", "medium", "low"] as const;

// Kept free of length limits on purpose: Claude's structured outputs work best with a plain schema.
// Lengths are enforced when saving.
export const OrganiseResult = z.object({
  summary: z.string().describe("One to three sentences on what you did with this material."),
  projects: z
    .array(
      z.object({
        existing_id: z.string().nullable().describe("id of the existing project this updates, or null for a new project"),
        name: z.string(),
        status: z.enum(PROJECT_STATUSES),
        priority: z.enum(PRIORITIES),
        summary: z.string().describe("What the project is, in one or two sentences."),
        current_work: z.string().describe("What is being worked on right now. Empty if nothing."),
        next_steps: z.array(z.string()).describe("Short, concrete next actions, most important first."),
        location: z.string().describe("Where it lives: USB/folder names, GitHub repo, app, etc. Empty if unknown."),
        links: z.array(z.string()).describe("URLs exactly as given."),
        target: z.string().describe("Deadline or timeframe if mentioned, e.g. '2026-11-01' or 'Q1'. Empty if unknown."),
        notes: z.string().describe("Anything else worth keeping that doesn't fit above."),
      }),
    )
    .describe("Only projects that are new or changed by this material."),
  unsorted: z.array(z.string()).describe("Bits of the material that don't belong to any project."),
});

export type OrganiseResultT = z.infer<typeof OrganiseResult>;

export const SYSTEM_PROMPT = `You are Project Organiser. The user throws unstructured material at you: brain dumps, notes, file contents from USB drives, GitHub links, half-finished lists. Your job is to turn it into a clean project register.

How to work:
- Group the material into projects. One project per distinct piece of work.
- You get the current register as JSON. When material is about a project that already exists (same project, even if named slightly differently), update it: set existing_id to its id and return the full updated record, merging old and new information. Keep existing details unless the new material clearly replaces them.
- Only return projects that are new or changed. Leave out existing projects the material doesn't touch.
- Status meanings: live = launched and in use; active = being worked on now; upcoming = planned and next in line; idea = someday/maybe; paused = on hold; done = finished.
- Priority: high if it's urgent, blocking or clearly important to the user; low for nice-to-haves; otherwise medium.
- next_steps are short, concrete actions (start with a verb), most important first. Derive them from the material; don't pad.
- Never invent facts, dates, links or names. If something is unknown, leave that field empty.
- Copy URLs exactly. Put where the project lives (USB drive or folder names, repo names, services) in location.
- Write in the language the material is written in (Swedish or English); keep the user's own project names.
- Put fragments that don't belong to any project in unsorted.`;
