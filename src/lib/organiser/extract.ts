export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at ~4.5 MB
export const MAX_TEXT_CHARS = 150_000;

const TEXT_EXT = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "yaml", "yml", "xml", "html", "htm", "ini", "toml"];
export const ACCEPTED = [...TEXT_EXT, "docx", "xlsx", "pdf"].map((e) => `.${e}`).join(",");

export interface ExtractedFile {
  name: string;
  size: number;
  kind: "text" | "pdf" | "skipped";
  text?: string;
  pdfBase64?: string;
  note?: string;
}

const ext = (name: string) => name.toLowerCase().split(".").pop() ?? "";

async function xlsxToText(buf: Buffer): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ArrayBuffer);
  const out: string[] = [];
  wb.eachSheet((sheet) => {
    out.push(`## Sheet: ${sheet.name}`);
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => {
        if (v === null || v === undefined) return "";
        if (typeof v === "object" && v !== null && "text" in v) return String((v as { text: unknown }).text);
        if (typeof v === "object" && v !== null && "result" in v) return String((v as { result: unknown }).result);
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        return String(v);
      });
      out.push(cells.join(" | "));
    });
  });
  return out.join("\n");
}

/** Turns uploaded files into text (or PDF blocks) Claude can read. Unsupported files are skipped with a note. */
export async function extractFiles(files: File[]): Promise<ExtractedFile[]> {
  const result: ExtractedFile[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    const e = ext(f.name);
    const base = { name: f.name.slice(0, 200), size: f.size };
    try {
      if (TEXT_EXT.includes(e)) {
        result.push({ ...base, kind: "text", text: await f.text() });
      } else if (e === "docx") {
        const mammoth = await import("mammoth");
        const { value } = await mammoth.extractRawText({ buffer: Buffer.from(await f.arrayBuffer()) });
        result.push({ ...base, kind: "text", text: value });
      } else if (e === "xlsx") {
        result.push({ ...base, kind: "text", text: await xlsxToText(Buffer.from(await f.arrayBuffer())) });
      } else if (e === "pdf") {
        result.push({ ...base, kind: "pdf", pdfBase64: Buffer.from(await f.arrayBuffer()).toString("base64") });
      } else {
        result.push({ ...base, kind: "skipped", note: "unsupported file type" });
      }
    } catch {
      result.push({ ...base, kind: "skipped", note: "could not be read" });
    }
  }
  return result;
}

/** Everything textual, in one block, for storing in the intake and sending to Claude. */
export function combineText(text: string, links: string, files: ExtractedFile[]): string {
  const parts: string[] = [];
  if (text.trim()) parts.push(`# Notes\n${text.trim()}`);
  if (links.trim()) parts.push(`# Links\n${links.trim()}`);
  for (const f of files) {
    if (f.kind === "text" && f.text?.trim()) parts.push(`# File: ${f.name}\n${f.text.trim()}`);
    if (f.kind === "pdf") parts.push(`# File: ${f.name}\n(PDF attached separately)`);
  }
  const all = parts.join("\n\n");
  return all.length > MAX_TEXT_CHARS ? all.slice(0, MAX_TEXT_CHARS) + "\n\n[…truncated]" : all;
}
