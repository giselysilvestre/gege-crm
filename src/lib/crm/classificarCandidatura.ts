import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CANDIDATURA_STATUS_INICIAL,
  type CandidaturaStatus,
  normalizeCandidaturaStatus,
  etapaFromStatus,
  isCandidaturaTerminal,
} from "@/lib/candidatura-status";
import { getFunilConfig, scoreAtingeCorte, type FunilConfig } from "./funilConfig";

export type ClassificarInput = {
  candidaturaId: string;
  /** Evento que disparou a reclassificação. */
  evento:
    | "triagem_cv"
    | "disparo_enviado"
    | "disparo_falha"
    | "primeira_resposta"
    | "interesse_confirmado"
    | "recusa"
    | "silencio_esgotado"
    | "score_entrevista"
    | "eliminar_entrevista"
    | "reclassificar_cortes"
    | "manual";
  scoreCv?: number | null;
  scoreEntrevista?: number | null;
  /** Status forçado (só evento manual). */
  statusManual?: CandidaturaStatus;
  eliminatorio?: boolean;
};

/**
 * Aplica regra de negócio e grava candidaturas.status.
 * Espelha etapa-mãe em whatsapp_sessoes.etapa_funil quando houver sessão.
 *
 * Escopo: só a candidatura do `candidaturaId` (atividade de outra vaga não conta).
 */
export async function classificarCandidatura(
  supabase: SupabaseClient,
  input: ClassificarInput
): Promise<CandidaturaStatus> {
  const config = await getFunilConfig(supabase);
  const { data: cand, error } = await supabase
    .from("candidaturas")
    .select("id,status")
    .eq("id", input.candidaturaId)
    .maybeSingle();
  if (error) throw error;
  if (!cand) throw new Error("Candidatura não encontrada");

  const atual = normalizeCandidaturaStatus(cand.status as string) ?? CANDIDATURA_STATUS_INICIAL;

  // Encaminhado/contratado (humano) não sobrescreve por automação
  if (
    input.evento !== "manual" &&
    (atual === "encaminhado_aguardando" ||
      atual === "encaminhado_avancar" ||
      atual === "encaminhado_reprovado" ||
      atual === "contratado")
  ) {
    return atual;
  }

  const proximo = decidirStatus(atual, input, config);
  if (proximo === atual) return atual;

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("candidaturas")
    .update({ status: proximo, atualizado_em: now })
    .eq("id", input.candidaturaId);
  if (upErr) throw upErr;

  const etapa = etapaFromStatus(proximo);
  if (etapa) {
    await supabase
      .from("whatsapp_sessoes")
      .update({ etapa_funil: etapa, atualizado_em: now })
      .eq("candidatura_id", input.candidaturaId);
  }

  return proximo;
}

function decidirStatus(
  atual: CandidaturaStatus,
  input: ClassificarInput,
  config: FunilConfig
): CandidaturaStatus {
  if (input.evento === "manual" && input.statusManual) {
    return input.statusManual;
  }

  switch (input.evento) {
    case "triagem_cv": {
      if (scoreAtingeCorte(input.scoreCv, config.score_cv_min)) return "inscrito_avancar";
      return "inscrito_reprovado";
    }
    case "disparo_enviado":
      return "abordado_sem_resposta";
    case "disparo_falha":
      return "inscrito_falha";
    case "primeira_resposta":
      if (isCandidaturaTerminal(atual) && atual !== "contratado") return atual;
      return "abordado_em_conversa";
    case "interesse_confirmado": {
      // Interessado + cortes → qualificado direto (sem pendente)
      if (
        scoreAtingeCorte(input.scoreCv, config.score_cv_min) &&
        scoreAtingeCorte(input.scoreEntrevista, config.score_entrevista_min)
      ) {
        return "qualificado_avancar";
      }
      return "abordado_avancar";
    }
    case "recusa":
      return "abordado_negativa";
    case "silencio_esgotado":
      return "abordado_reprovado_sem_resposta";
    case "eliminar_entrevista":
      return "qualificado_reprovado_entrevista";
    case "score_entrevista":
    case "reclassificar_cortes": {
      return reclassificarPorCortes(atual, input.scoreCv, input.scoreEntrevista, config);
    }
    default:
      return atual;
  }
}

/**
 * Retroativo ao mudar cortes:
 * - inscrito: avança/reprova por CV
 * - interessado (abordado_avancar) ou já qualificado automático: reaplica cortes
 */
export function reclassificarPorCortes(
  atual: CandidaturaStatus,
  scoreCv: number | null | undefined,
  scoreEntrevista: number | null | undefined,
  config: FunilConfig
): CandidaturaStatus {
  const etapa = etapaFromStatus(atual);

  if (atual === "inscrito_aguardando_disparo" || atual === "inscrito_avancar" || atual === "inscrito_reprovado") {
    return scoreAtingeCorte(scoreCv, config.score_cv_min) ? "inscrito_avancar" : "inscrito_reprovado";
  }

  // Interessado / qualificado (automático) — reaplica cortes
  if (
    atual === "abordado_avancar" ||
    atual === "qualificado_avancar" ||
    atual === "qualificado_reprovado_entrevista"
  ) {
    const cvOk = scoreAtingeCorte(scoreCv, config.score_cv_min);
    const entOk = scoreAtingeCorte(scoreEntrevista, config.score_entrevista_min);
    if (cvOk && entOk) return "qualificado_avancar";
    if (!entOk && config.score_entrevista_min > 0 && scoreEntrevista != null) {
      return "qualificado_reprovado_entrevista";
    }
    return "abordado_avancar";
  }

  if (etapa === "encaminhado" || etapa === "contratado") return atual;
  return atual;
}

/** Reaplica cortes em todas as candidaturas elegíveis (mudança de config). */
export async function reclassificarTodasPorCortes(
  supabase: SupabaseClient,
  opts?: { limit?: number }
): Promise<{ atualizadas: number }> {
  const config = await getFunilConfig(supabase);
  const limit = opts?.limit ?? 5000;

  const { data, error } = await supabase
    .from("candidaturas")
    .select("id,status,candidato_id")
    .eq("arquivada", false)
    .limit(limit);
  if (error) throw error;

  const rows = data ?? [];
  const candidatoIds = [...new Set(rows.map((r) => r.candidato_id).filter(Boolean))] as string[];

  const analiseByCand = new Map<string, { score_ia: number | null; score_pos_entrevista: number | null }>();
  for (let i = 0; i < candidatoIds.length; i += 40) {
    const slice = candidatoIds.slice(i, i + 40);
    const { data: anals } = await supabase
      .from("candidatos_analise")
      .select("candidato_id,score_ia,score_pos_entrevista")
      .in("candidato_id", slice);
    for (const a of anals ?? []) {
      analiseByCand.set(String(a.candidato_id), {
        score_ia: a.score_ia != null ? Number(a.score_ia) : null,
        score_pos_entrevista:
          a.score_pos_entrevista != null ? Number(a.score_pos_entrevista) : null,
      });
    }
  }

  let atualizadas = 0;
  for (const row of rows) {
    const atual = normalizeCandidaturaStatus(row.status as string);
    if (!atual) continue;
    if (
      atual !== "inscrito_aguardando_disparo" &&
      atual !== "inscrito_avancar" &&
      atual !== "inscrito_reprovado" &&
      atual !== "abordado_avancar" &&
      atual !== "qualificado_avancar" &&
      atual !== "qualificado_reprovado_entrevista"
    ) {
      continue;
    }
    const analise = analiseByCand.get(String(row.candidato_id));
    const proximo = reclassificarPorCortes(
      atual,
      analise?.score_ia,
      analise?.score_pos_entrevista,
      config
    );
    if (proximo === atual) continue;
    await classificarCandidatura(supabase, {
      candidaturaId: String(row.id),
      evento: "manual",
      statusManual: proximo,
      scoreCv: analise?.score_ia,
      scoreEntrevista: analise?.score_pos_entrevista,
    });
    atualizadas += 1;
  }

  return { atualizadas };
}
