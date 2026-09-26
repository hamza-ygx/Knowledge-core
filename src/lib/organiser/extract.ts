export const MAX_FILES = 10;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024; // Vercel caps request bodies at ~4.5 MB

const TEXT_EXT = ["txt", "md", "markdown", "csv", "tsv", "json", "log", "yaml", "yml", "xml", "html", "htm", "ini", "toml"];
export const ACCEPTED = [...TEXT_EXT, "docx", "xlsx", "pdf"].map((e) => `.${e}`).join(",");

export interface ExtractedFile {
  name: string;
  size: number;
  kind: "text" | "skipped";
  text?: string;
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
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === "object" && "text" in v) return String((v as { text: unknown }).text);
        if (typeof v === "object" && "result" in v) return String((v as { result: unknown }).result);
        return String(v);
      });
      out.push(cells.join(" | "));
    });
  });
  return out.join("\n");
}

/** PDFs are read as text here instead of being sent to Claude as documents: far fewer tokens. */
async function pdfToText(buf: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

/** Turns uploaded files into text Claude can read. Unsupported or unreadable files are skipped with a note. */
export async function extractFiles(files: File[]): Promise<ExtractedFile[]> {
  const result: ExtractedFile[] = [];
  for (const f of files.slice(0, MAX_FILES)) {
    const e = ext(f.name);
    const base = { name: f.name.slice(0, 200), size: f.size };
    try {
      let text: string | null = null;
      if (TEXT_EXT.includes(e)) text = await f.text();
      else if (e === "docx") {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ buffer: Buffer.from(await f.arrayBuffer()) })).value;
      } else if (e === "xlsx") text = await xlsxToText(Buffer.from(await f.arrayBuffer()));
      else if (e === "pdf") {
        text = await pdfToText(Buffer.from(await f.arrayBuffer()));
        if (text.trim().length < 20) {
          result.push({ ...base, kind: "skipped", note: "scanned PDF with no text layer" });
          continue;
        }
      }
      if (text === null) result.push({ ...base, kind: "skipped", note: "unsupported file type" });
      else result.push({ ...base, kind: "text", text: text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n") });
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
  for (const f of files) if (f.kind === "text" && f.text?.trim()) parts.push(`# File: ${f.name}\n${f.text.trim()}`);
  return parts.join("\n\n");
}
