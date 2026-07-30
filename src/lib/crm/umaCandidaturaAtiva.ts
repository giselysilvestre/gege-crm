import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante no máximo 1 candidatura ativa por candidato.
 * Mantém `manterId` (ou a mais recente) e arquiva as demais.
 */
export async function garantirUmaCandidaturaAtiva(
  supabase: SupabaseClient,
  candidatoId: string,
  manterId?: string | null
): Promise<{ mantidaId: string | null; arquivadas: number }> {
  const { data, error } = await supabase
    .from("candidaturas")
    .select("id,enviado_em,atualizado_em")
    .eq("candidato_id", candidatoId)
    .or("arquivada.is.null,arquivada.eq.false");
  if (error) throw error;

  const ativas = data ?? [];
  if (ativas.length === 0) return { mantidaId: null, arquivadas: 0 };

  const ranked = [...ativas].sort((a, b) => {
    const ta = Date.parse(String(a.enviado_em ?? a.atualizado_em ?? "")) || 0;
    const tb = Date.parse(String(b.enviado_em ?? b.atualizado_em ?? "")) || 0;
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  });

  const preferida =
    manterId && ativas.some((r) => String(r.id) === String(manterId))
      ? String(manterId)
      : String(ranked[0].id);

  const paraArquivar = ativas
    .map((r) => String(r.id))
    .filter((id) => id !== preferida);

  if (paraArquivar.length === 0) return { mantidaId: preferida, arquivadas: 0 };

  const now = new Date().toISOString();
  const { error: upErr } = await supabase
    .from("candidaturas")
    .update({ arquivada: true, arquivada_em: now, atualizado_em: now })
    .in("id", paraArquivar);
  if (upErr) throw upErr;

  return { mantidaId: preferida, arquivadas: paraArquivar.length };
}
