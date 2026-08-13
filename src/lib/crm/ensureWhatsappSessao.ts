import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Garante whatsapp_sessoes para candidatura ativa (sessão vazia, sem outbound).
 * Idempotente — safe chamar várias vezes.
 */
export async function ensureWhatsappSessaoForCandidatura(
  supabase: SupabaseClient,
  candidatoId: string,
  candidaturaId: string
): Promise<string> {
  const { data: byCandList, error: e1 } = await supabase
    .from("whatsapp_sessoes")
    .select("id")
    .eq("candidatura_id", candidaturaId)
    .order("atualizado_em", { ascending: false, nullsFirst: false })
    .limit(1);
  if (e1) throw e1;
  if (byCandList?.[0]?.id) return byCandList[0].id as string;

  const { data: activeList, error: e2 } = await supabase
    .from("whatsapp_sessoes")
    .select("id")
    .eq("candidato_id", candidatoId)
    .eq("status", "ativo")
    .order("atualizado_em", { ascending: false, nullsFirst: false })
    .limit(1);
  if (e2) throw e2;

  const active = activeList?.[0];
  if (active?.id) {
    const { error: upErr } = await supabase
      .from("whatsapp_sessoes")
      .update({
        candidatura_id: candidaturaId,
        etapa_funil: "inscrito",
        status: "ativo",
        atualizado_em: new Date().toISOString(),
      })
      .eq("id", active.id);
    if (upErr) throw upErr;
    return active.id as string;
  }

  const { data: created, error: insErr } = await supabase
    .from("whatsapp_sessoes")
    .insert({
      candidato_id: candidatoId,
      candidatura_id: candidaturaId,
      status: "ativo",
      tipo_fluxo: "candidatura",
      etapa_atual: "abertura",
      etapa_funil: "inscrito",
      etapas_concluidas: [],
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return created.id as string;
}

/** Cria sessões faltantes para candidaturas ativas (backfill ao carregar CRM por vaga/cliente). */
export async function ensureWhatsappSessoesForCandidaturas(
  supabase: SupabaseClient,
  candidaturas: { id: string; candidato_id: string }[]
): Promise<number> {
  if (candidaturas.length === 0) return 0;

  const ids = candidaturas.map((c) => c.id);
  const withSessao = new Set<string>();
  for (let i = 0; i < ids.length; i += 80) {
    const slice = ids.slice(i, i + 80);
    const { data, error } = await supabase
      .from("whatsapp_sessoes")
      .select("candidatura_id")
      .in("candidatura_id", slice);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.candidatura_id) withSessao.add(row.candidatura_id as string);
    }
  }

  let created = 0;
  for (const c of candidaturas) {
    if (withSessao.has(c.id) || !c.candidato_id) continue;
    await ensureWhatsappSessaoForCandidatura(supabase, c.candidato_id, c.id);
    created += 1;
  }
  return created;
}
