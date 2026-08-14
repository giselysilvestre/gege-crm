import { NextResponse } from "next/server";
import { analyzeCvWithClaude } from "@/lib/cv-import/analyzeCv";
import { extractPdfText } from "@/lib/cv-import/extractPdf";
import { findExistingByPdfBuffer, persistCvImport } from "@/lib/cv-import/persistCv";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Vercel Hobby: até 300s. Análise de CV pode levar ~30–90s. */
export const maxDuration = 300;

/** Limite real do body no Vercel (~4,5 MB). Acima disso a plataforma devolve HTML, não JSON. */
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET() {
  return NextResponse.json({ ok: true, service: "cvs-import" });
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const batchId = String(form.get("batchId") ?? "").trim() || `crm-${Date.now()}`;
    const origemLabel = String(form.get("origem") ?? "").trim();
    const origem = origemLabel || `Import CRM ${batchId}`;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo PDF é obrigatório" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Só aceitamos PDF" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "PDF muito grande (máx. 4 MB por arquivo)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseAdmin();

    const existing = await findExistingByPdfBuffer(supabase, buffer);
    if (existing) {
      return NextResponse.json({
        ok: true,
        fileName: file.name,
        batchId,
        status: "skipped_duplicate",
        candidatoId: existing.id,
        nome: existing.nome,
        scoreIa: null,
        message: "Este PDF já foi importado antes",
      });
    }

    const cvText = await extractPdfText(buffer);
    if (!cvText || cvText.length < 80) {
      return NextResponse.json(
        { error: "Não foi possível ler texto do PDF (scan/imagem ou arquivo vazio)" },
        { status: 422 }
      );
    }

    const extracted = await analyzeCvWithClaude(cvText);
    const result = await persistCvImport(supabase, buffer, extracted, origem);

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      batchId,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao importar CV";
    console.error("[cvs/import]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
