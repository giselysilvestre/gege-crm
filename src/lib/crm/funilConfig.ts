import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Config do funil (preparado para painel de controle).
 * Defaults: cortes = 0; FUP silêncio = 3 dias; FUP dentro de 24h ligado.
 */
export type FunilConfig = {
  score_cv_min: number;
  score_entrevista_min: number;
  /** Horas após disparo para 1º FUP automático (painel). */
  fup_abordagem_horas: number;
  /** Se true, agenda FUP de interesse antes de fechar janela 24h (painel). */
  fup_interesse_antes_24h: boolean;
  /** Dias sem resposta até abordado_reprovado_sem_resposta. */
  fup_silencio_dias: number;
};

export const FUNIL_CONFIG_DEFAULTS: FunilConfig = {
  score_cv_min: 0,
  score_entrevista_min: 0,
  fup_abordagem_horas: 20,
  fup_interesse_antes_24h: true,
  fup_silencio_dias: 3,
};

let cache: { at: number; value: FunilConfig } | null = null;
const CACHE_MS = 30_000;

export async function getFunilConfig(supabase: SupabaseClient): Promise<FunilConfig> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.value;

  try {
    const { data, error } = await supabase
      .from("crm_funil_config")
      .select(
        "score_cv_min,score_entrevista_min,fup_abordagem_horas,fup_interesse_antes_24h,fup_silencio_dias"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error || !data) {
      cache = { at: now, value: { ...FUNIL_CONFIG_DEFAULTS } };
      return cache.value;
    }

    const value: FunilConfig = {
      score_cv_min: Number(data.score_cv_min ?? 0),
      score_entrevista_min: Number(data.score_entrevista_min ?? 0),
      fup_abordagem_horas: Number(data.fup_abordagem_horas ?? FUNIL_CONFIG_DEFAULTS.fup_abordagem_horas),
      fup_interesse_antes_24h: data.fup_interesse_antes_24h !== false,
      fup_silencio_dias: Number(data.fup_silencio_dias ?? FUNIL_CONFIG_DEFAULTS.fup_silencio_dias),
    };
    cache = { at: now, value };
    return value;
  } catch {
    cache = { at: now, value: { ...FUNIL_CONFIG_DEFAULTS } };
    return cache.value;
  }
}

export function clearFunilConfigCache() {
  cache = null;
}

/** Sem nota: passa se corte === 0; senão falha. */
export function scoreAtingeCorte(score: number | null | undefined, corte: number): boolean {
  if (corte <= 0) return true;
  if (score == null || Number.isNaN(Number(score))) return false;
  return Number(score) >= corte;
}
