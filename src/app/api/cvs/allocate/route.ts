import { NextResponse } from "next/server";
import { allocateCandidatosToVaga } from "@/lib/cv-import/allocateToVaga";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { vagaId?: string; candidatoIds?: string[] };
    const vagaId = String(body.vagaId ?? "").trim();
    const candidatoIds = Array.isArray(body.candidatoIds) ? body.candidatoIds.map(String) : [];

    if (!vagaId) {
      return NextResponse.json({ error: "vagaId é obrigatório" }, { status: 400 });
    }
    if (candidatoIds.length === 0) {
      return NextResponse.json({ error: "candidatoIds é obrigatório" }, { status: 400 });
    }
    if (candidatoIds.length > 100) {
      return NextResponse.json({ error: "Máximo 100 candidatos por alocação" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const result = await allocateCandidatosToVaga(supabase, vagaId, candidatoIds);

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao alocar candidatos";
    console.error("[cvs/allocate]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
