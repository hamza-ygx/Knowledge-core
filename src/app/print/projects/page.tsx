"use client";

import { useEffect, useState } from "react";
import { PRIORITY_LABELS, type Project } from "@/data/types";
import { grouped } from "@/lib/organiser/export";
import { supabase } from "@/lib/supabase/client";

/** Printable register. Opens the print dialog once loaded; "Save as PDF" there gives a PDF. */
export default function PrintProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase()
      .from("projects")
      .select("*")
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setProjects(
          (data ?? []).map((r) => ({
            id: r.id,
            name: r.name,
            status: r.status as Project["status"],
            priority: r.priority as Project["priority"],
            summary: r.summary,
            currentWork: r.current_work,
            nextSteps: r.next_steps,
            location: r.location,
            links: r.links,
            target: r.target,
            notes: r.notes,
            position: r.position,
            updatedAt: r.updated_at,
          })),
        );
      });
  }, []);

  useEffect(() => {
    if (projects?.length) {
      const id = setTimeout(() => window.print(), 400);
      return () => clearTimeout(id);
    }
  }, [projects]);

  return (
    <div className="print-page bg-white text-[#1b1b1b]">
      <div className="mx-auto max-w-[900px] px-10 py-10 print:px-0 print:py-0">
        <div className="mb-6 flex items-end justify-between border-b-2 border-[#e8541f] pb-3">
          <div>
            <h1 className="text-[26px] font-bold">Projects</h1>
            <p className="text-[12px] text-[#666]">
              {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              {projects && ` · ${projects.length} projects`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-md bg-[#e8541f] px-4 py-2 text-[12px] font-semibold text-white print:hidden"
          >
            Print / Save as PDF
          </button>
        </div>

        {error && <p className="text-red-700">Couldn&apos;t load projects: {error}</p>}
        {!projects && !error && <p className="text-[#666]">Loading…</p>}
        {projects?.length === 0 && <p className="text-[#666]">No projects yet.</p>}

        {projects &&
          grouped(projects).map((g) => (
            <section key={g.status} className="mb-7">
              <h2 className="mb-3 text-[15px] font-bold uppercase tracking-wide text-[#e8541f]">
                {g.label} <span className="font-normal text-[#999]">({g.items.length})</span>
              </h2>
              <div className="space-y-3">
                {g.items.map((p) => (
                  <article key={p.id} className="break-inside-avoid rounded-md border border-[#ddd] px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="text-[15px] font-bold">{p.name}</h3>
                      <span className="shrink-0 text-[11px] text-[#777]">
                        {PRIORITY_LABELS[p.priority]} priority{p.target && ` · ${p.target}`}
                      </span>
                    </div>
                    {p.summary && <p className="mt-1 text-[12.5px] text-[#333]">{p.summary}</p>}
                    {p.currentWork && (
                      <p className="mt-1.5 text-[12.5px]">
                        <b>Being worked on:</b> {p.currentWork}
                      </p>
                    )}
                    {p.nextSteps.length > 0 && (
                      <div className="mt-1.5 text-[12.5px]">
                        <b>Next steps:</b>
                        <ul className="ml-5 list-disc">
                          {p.nextSteps.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {p.location && (
                      <p className="mt-1.5 text-[12px] text-[#444]">
                        <b>Where it lives:</b> {p.location}
                      </p>
                    )}
                    {p.links.length > 0 && <p className="mt-1 break-all text-[11.5px] text-[#555]">{p.links.join(" · ")}</p>}
                    {p.notes && <p className="mt-1 text-[12px] italic text-[#555]">{p.notes}</p>}
                  </article>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}
