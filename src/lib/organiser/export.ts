"use client";

import { PRIORITY_LABELS, PROJECT_STATUS_LABELS, PROJECT_STATUS_ORDER, type Project } from "@/data/types";

const stamp = () => new Date().toISOString().slice(0, 10);

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Projects grouped in status order, then by priority. */
export function grouped(projects: Project[]) {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return PROJECT_STATUS_ORDER.map((status) => ({
    status,
    label: PROJECT_STATUS_LABELS[status],
    items: projects.filter((p) => p.status === status).sort((a, b) => rank[a.priority] - rank[b.priority] || a.position - b.position),
  })).filter((g) => g.items.length > 0);
}

export async function exportExcel(projects: Project[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Agent Org Map";
  const ws = wb.addWorksheet("Projects", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Project", key: "name", width: 28 },
    { header: "Status", key: "status", width: 16 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Target", key: "target", width: 14 },
    { header: "Summary", key: "summary", width: 45 },
    { header: "Being worked on", key: "current", width: 40 },
    { header: "Next steps", key: "next", width: 45 },
    { header: "Where it lives", key: "location", width: 28 },
    { header: "Links", key: "links", width: 36 },
    { header: "Notes", key: "notes", width: 36 },
  ];
  for (const g of grouped(projects)) {
    for (const p of g.items) {
      ws.addRow({
        name: p.name,
        status: g.label,
        priority: PRIORITY_LABELS[p.priority],
        target: p.target,
        summary: p.summary,
        current: p.currentWork,
        next: p.nextSteps.map((s) => `• ${s}`).join("\n"),
        location: p.location,
        links: p.links.join("\n"),
        notes: p.notes,
      });
    }
  }
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8541F" } };
  header.height = 22;
  ws.eachRow((row, i) => {
    row.alignment = { vertical: "top", wrapText: true };
    if (i > 1 && i % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF4EE" } };
  });
  ws.autoFilter = { from: "A1", to: "J1" };
  ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 };

  const buf = await wb.xlsx.writeBuffer();
  download(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `projects-${stamp()}.xlsx`);
}

export async function exportWord(projects: Project[]) {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ text: "Projects", heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `Updated ${new Date().toLocaleDateString()} · ${projects.length} projects`, color: "777777" })] }),
  ];
  const line = (label: string, value: string) =>
    value.trim() ? [new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value)] })] : [];

  for (const g of grouped(projects)) {
    children.push(new Paragraph({ text: `${g.label} (${g.items.length})`, heading: HeadingLevel.HEADING_1 }));
    for (const p of g.items) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun(p.name), new TextRun({ text: `  ·  ${PRIORITY_LABELS[p.priority]} priority${p.target ? ` · ${p.target}` : ""}`, size: 20, color: "888888" })],
        }),
        ...(p.summary ? [new Paragraph(p.summary)] : []),
        ...line("Being worked on", p.currentWork),
        ...(p.nextSteps.length ? [new Paragraph({ children: [new TextRun({ text: "Next steps:", bold: true })] })] : []),
        ...p.nextSteps.map((s) => new Paragraph({ text: s, bullet: { level: 0 } })),
        ...line("Where it lives", p.location),
        ...line("Links", p.links.join(", ")),
        ...line("Notes", p.notes),
      );
    }
  }

  const doc = new Document({ creator: "Agent Org Map", title: "Projects", sections: [{ children }] });
  download(await Packer.toBlob(doc), `projects-${stamp()}.docx`);
}
