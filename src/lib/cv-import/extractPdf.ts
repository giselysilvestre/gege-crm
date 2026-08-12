import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PdfParseResult = { text?: string };

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfParse = require("pdf-parse") as (input: Buffer) => Promise<PdfParseResult>;
  const data = await pdfParse(buffer);
  return data?.text?.trim() ?? "";
}
