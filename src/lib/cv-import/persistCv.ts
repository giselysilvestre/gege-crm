import type { SupabaseClient } from "@supabase/supabase-js";
import type { CvExtracted } from "./analyzeCv";
import { getCvAnalysisModelLabel } from "./analyzeCv";
import {
  localPdfId,
  normalizeEmail,
  normalizeIsoDateField,
  normalizeNome,
  normalizeTelefone,
  toNullableInt,
  toNullableString,
} from "./normalize";

function computeTags(experiencias: { setor?: string | null; meses?: number | null; eh_lideranca?: boolean | null; crescimento_interno?: boolean | null }[]) {
  const tags: string[] = [];
  if (experiencias.some((e) => e.crescimento_interno)) tags.push("crescimento");
  const mesesFood = experiencias
    .filter((e) => e.setor && ["alimentacao", "cozinha", "atendimento"].includes(e.setor))
    .reduce((s, e) => s + (Number(e.meses) || 0), 0);
  if (mesesFood > 12) tags.push("food");
  const mesesLideranca = experiencias.filter((e) => e.eh_lideranca).reduce((s, e) => s + (Number(e.meses) || 0), 0);
  if (mesesLideranca > 12) tags.push("lideranca");
  const curtos = experiencias.filter((e) => (Number(e.meses) || 0) > 0 && (Number(e.meses) || 0) < 5).length;
  if (curtos > 3 || (experiencias.length > 0 && curtos / experiencias.length > 0.5)) {
    tags.push("alerta_instabilidade");
  }
  if (experiencias.length === 0 || experiencias.every((e) => !e.meses)) tags.push("primeiro_emprego");
  return tags;
}

async function findDuplicateCandidatoId(
  supabase: SupabaseClient,
  telefone: string | null,
  email: string | null,
  localId: string
): Promise<string | null> {
  const { data: byLocal, error: e1 } = await supabase
    .from("candidatos")
    .select("id")
    .eq("gmail_message_id", localId)
    .maybeSingle();
  if (e1) throw e1;
  if (byLocal?.id) return byLocal.id as string;

  if (telefone) {
    const { data, error } = await supabase.from("candidatos").select("id").eq("telefone", telefone).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }
  if (email) {
    const { data, error } = await supabase.from("candidatos").select("id").eq("email", email).maybeSingle();
    if (error) throw error;
    if (data?.id) return data.id as string;
  }
  return null;
}

export type PersistCvResult =
  | { status: "skipped_duplicate"; candidatoId: string; nome: string; message: string }
  | { status: "skipped_no_name"; message: string }
  | { status: "inserted" | "updated"; candidatoId: string; nome: string; scoreIa: number | null };

export async function persistCvImport(
  supabase: SupabaseClient,
  pdfBuffer: Buffer,
  extracted: CvExtracted,
  origem: string
): Promise<PersistCvResult> {
  const localId = localPdfId(pdfBuffer);
  const cand = extracted.candidato || {};
  const nome = normalizeNome(cand.nome);
  if (!nome) return { status: "skipped_no_name", message: "Nome não identificado no CV" };

  const telefone = normalizeTelefone(cand.telefone);
  const email = normalizeEmail(cand.email);

  const dupId = await findDuplicateCandidatoId(supabase, telefone, email, localId);
  if (dupId) {
    const { data: existing } = await supabase.from("candidatos").select("nome").eq("id", dupId).maybeSingle();
    return {
      status: "skipped_duplicate",
      candidatoId: dupId,
      nome: (existing?.nome as string) || nome,
      message: "CV já existia no banco (mesmo arquivo, telefone ou e-mail)",
    };
  }

  const temLocalizacao =
    toNullableString(cand.cidade) || toNullableString(cand.bairro) || toNullableString(cand.cep);

  const candidatoPayload: Record<string, unknown> = {
    nome,
    telefone,
    email,
    cargo_principal: toNullableString(cand.cargo_principal),
    cidade: toNullableString(cand.cidade),
    bairro: toNullableString(cand.bairro),
    cep: toNullableString(cand.cep),
    escolaridade: toNullableString(cand.escolaridade),
    genero: toNullableString(cand.genero),
    data_nascimento: normalizeIsoDateField(cand.data_nascimento),
    situacao_emprego: toNullableString(cand.situacao_emprego),
    origem,
    curriculo_url: null,
    gmail_message_id: localId,
    atualizado_em: new Date().toISOString(),
  };
  if (temLocalizacao) candidatoPayload.localizacao_fonte = "cv";

  const { data: inserted, error: insErr } = await supabase
    .from("candidatos")
    .insert(candidatoPayload)
    .select("id")
    .single();
  if (insErr) throw new Error(insErr.message);
  const candidatoId = inserted.id as string;

  const experiencias = Array.isArray(extracted.experiencias) ? extracted.experiencias : [];
  const expRows: Record<string, unknown>[] = [];
  for (const e of experiencias) {
    const empresa = toNullableString(e?.empresa);
    if (!empresa) continue;
    expRows.push({
      candidato_id: candidatoId,
      empresa,
      cargo: toNullableString(e?.cargo),
      setor: String(e?.setor || "outro").replace(/\s/g, ""),
      data_inicio: normalizeIsoDateField(e?.data_inicio),
      data_fim: normalizeIsoDateField(e?.data_fim),
      meses: toNullableInt(e?.meses),
      eh_lideranca: typeof e?.eh_lideranca === "boolean" ? e.eh_lideranca : null,
      crescimento_interno: typeof e?.crescimento_interno === "boolean" ? e.crescimento_interno : null,
    });
  }
  if (expRows.length) {
    const { error: expErr } = await supabase.from("candidatos_experiencia").insert(expRows);
    if (expErr) throw new Error(expErr.message);
  }

  const tags = computeTags(
    expRows.map((r) => ({
      setor: r.setor as string,
      meses: r.meses as number | null,
      eh_lideranca: r.eh_lideranca as boolean | null,
      crescimento_interno: r.crescimento_interno as boolean | null,
    }))
  );

  const analise = extracted.analise || {};
  const scoreIa = toNullableInt(analise.score_ia);
  const fitRaw = String(analise.fit_food_service ?? "");
  const fitNormalized = ["Alto", "Médio", "Baixo"].find((v) => fitRaw.startsWith(v)) || null;

  const analisePayload = {
    candidato_id: candidatoId,
    perfil_resumo: toNullableString(analise.perfil_resumo),
    pontos_fortes: toNullableString(analise.pontos_fortes),
    red_flags: toNullableString(analise.red_flags),
    fit_food_service: fitNormalized,
    analise_completa: toNullableString(analise.analise_completa),
    score_ia: scoreIa,
    score_final: scoreIa,
    tags,
    ultima_experiencia: toNullableString(analise.ultima_experiencia),
    modelo_usado: getCvAnalysisModelLabel(),
    processado_em: new Date().toISOString(),
  };

  const { error: anErr } = await supabase.from("candidatos_analise").insert(analisePayload);
  if (anErr) throw new Error(anErr.message);

  return { status: "inserted", candidatoId, nome, scoreIa };
}

export async function findExistingByPdfBuffer(
  supabase: SupabaseClient,
  pdfBuffer: Buffer
): Promise<{ id: string; nome: string } | null> {
  const localId = localPdfId(pdfBuffer);
  const { data, error } = await supabase.from("candidatos").select("id,nome").eq("gmail_message_id", localId).maybeSingle();
  if (error) throw error;
  if (!data?.id) return null;
  return { id: data.id as string, nome: (data.nome as string) || "Sem nome" };
}
