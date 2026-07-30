import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  clearFunilConfigCache,
  FUNIL_CONFIG_DEFAULTS,
  getFunilConfig,
} from "@/lib/crm/funilConfig";
import { reclassificarTodasPorCortes } from "@/lib/crm/classificarCandidatura";

export const dynamic = "force-dynamic";

/** GET — lê config (painel de controle futuro). */
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const config = await getFunilConfig(supabase);
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), config: FUNIL_CONFIG_DEFAULTS },
      { status: 500 }
    );
  }
}

/**
 * PUT — atualiza cortes/FUP e, por padrão, reclassifica candidaturas elegíveis.
 * Body: { score_cv_min?, score_entrevista_min?, fup_*, reclassificar?: boolean }
 */
export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const supabase = getSupabaseAdmin();

    const patch: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
    if (body.score_cv_min != null) patch.score_cv_min = Number(body.score_cv_min);
    if (body.score_entrevista_min != null) {
      patch.score_entrevista_min = Number(body.score_entrevista_min);
    }
    if (body.fup_abordagem_horas != null) {
      patch.fup_abordagem_horas = Number(body.fup_abordagem_horas);
    }
    if (body.fup_interesse_antes_24h != null) {
      patch.fup_interesse_antes_24h = Boolean(body.fup_interesse_antes_24h);
    }
    if (body.fup_silencio_dias != null) {
      patch.fup_silencio_dias = Number(body.fup_silencio_dias);
    }

    const { error } = await supabase.from("crm_funil_config").upsert({ id: 1, ...patch });
    if (error) throw error;

    clearFunilConfigCache();
    const config = await getFunilConfig(supabase);

    let reclassificacao: { atualizadas: number } | null = null;
    if (body.reclassificar !== false) {
      reclassificacao = await reclassificarTodasPorCortes(supabase);
    }

    return NextResponse.json({ ok: true, config, reclassificacao });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
