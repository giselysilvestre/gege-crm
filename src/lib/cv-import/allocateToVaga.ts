import type { SupabaseClient } from "@supabase/supabase-js";
import { CANDIDATURA_STATUS_INICIAL } from "@/lib/candidatura-status";
import { ensureWhatsappSessaoForCandidatura } from "@/lib/crm/ensureWhatsappSessao";
import { garantirUmaCandidaturaAtiva } from "@/lib/crm/umaCandidaturaAtiva";
import { toNullableInt } from "@/lib/cv-import/normalize";

const REPROVADOS = new Set([
  "inscrito_reprovado",
  "inscrito_falha",
  "abordado_reprovado_sem_resposta",
  "abordado_negativa",
  "qualificado_reprovado_entrevista",
  "encaminhado_reprovado",
]);

function formatAllocateError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const o = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    if (typeof o.message === "string" && o.message.trim()) return o.message;
    if (typeof o.details === "string" && o.details.trim()) return o.details;
    if (typeof o.hint === "string" && o.hint.trim()) return o.hint;
    if (o.code != null) return String(o.code);
  }
  return String(err);
}

export type AllocateResult = {
  inseridos: number;
  movidos: number;
  jaNaVaga: number;
  semAnalise: number;
  erros: { candidatoId: string; error: string }[];
};

export async function allocateCandidatosToVaga(
  supabase: SupabaseClient,
  vagaId: string,
  candidatoIds: string[]
): Promise<AllocateResult> {
  const unique = [...new Set(candidatoIds.filter(Boolean))];
  const result: AllocateResult = {
    inseridos: 0,
    movidos: 0,
    jaNaVaga: 0,
    semAnalise: 0,
    erros: [],
  };
  if (unique.length === 0) return result;

  const { data: vaga, error: vagaErr } = await supabase.from("vagas").select("id").eq("id", vagaId).maybeSingle();
  if (vagaErr) throw vagaErr;
  if (!vaga) throw new Error("Vaga não encontrada");

  const analiseByCand = new Map<string, { score_ia: number | null; score_final: number | null }>();
  for (let i = 0; i < unique.length; i += 200) {
    const slice = unique.slice(i, i + 200);
    const { data, error } = await supabase
      .from("candidatos_analise")
      .select("candidato_id,score_ia,score_final")
      .in("candidato_id", slice);
    if (error) throw error;
    for (const row of data ?? []) {
      analiseByCand.set(row.candidato_id as string, {
        score_ia: toNullableInt(row.score_ia),
        score_final: toNullableInt(row.score_final),
      });
    }
  }

  const { data: naVaga, error: naVagaErr } = await supabase
    .from("candidaturas")
    .select("candidato_id")
    .eq("vaga_id", vagaId)
    .or("arquivada.is.null,arquivada.eq.false");
  if (naVagaErr) throw naVagaErr;
  const jaInscritos = new Set((naVaga ?? []).map((r) => r.candidato_id as string));

  for (const candidatoId of unique) {
    try {
      if (jaInscritos.has(candidatoId)) {
        result.jaNaVaga += 1;
        continue;
      }
      const analise = analiseByCand.get(candidatoId);
      if (!analise) {
        result.semAnalise += 1;
        continue;
      }

      const score = analise.score_final ?? analise.score_ia ?? null;

      const { data: ativas, error: actErr } = await supabase
        .from("candidaturas")
        .select("id,vaga_id,status,arquivada")
        .eq("candidato_id", candidatoId)
        .or("arquivada.is.null,arquivada.eq.false");
      if (actErr) throw actErr;

      const ativa = (ativas ?? []).find((c) => !c.arquivada && !REPROVADOS.has(String(c.status)));

      if (ativa) {
        const { error: upErr } = await supabase
          .from("candidaturas")
          .update({
            vaga_id: vagaId,
            status: CANDIDATURA_STATUS_INICIAL,
            origem_candidatura: "banco_talentos",
            score_compatibilidade: score,
            atualizado_em: new Date().toISOString(),
          })
          .eq("id", ativa.id);
        if (upErr) throw upErr;
        await garantirUmaCandidaturaAtiva(supabase, candidatoId, ativa.id as string);
        await ensureWhatsappSessaoForCandidatura(supabase, candidatoId, ativa.id as string);
        result.movidos += 1;
        continue;
      }

      const { data: inserted, error: insErr } = await supabase
        .from("candidaturas")
        .insert({
          candidato_id: candidatoId,
          vaga_id: vagaId,
          status: CANDIDATURA_STATUS_INICIAL,
          origem_candidatura: "banco_talentos",
          score_compatibilidade: score,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;
      await garantirUmaCandidaturaAtiva(supabase, candidatoId, inserted.id as string);
      await ensureWhatsappSessaoForCandidatura(supabase, candidatoId, inserted.id as string);
      result.inseridos += 1;
    } catch (e) {
      result.erros.push({
        candidatoId,
        error: formatAllocateError(e),
      });
    }
  }

  return result;
}
