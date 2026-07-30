import {
  CANDIDATURA_ETAPAS,
  CANDIDATURA_STATUS_INICIAL,
  etapaFromStatus,
  normalizeCandidaturaStatus,
  type CandidaturaEtapa,
  type CandidaturaStatus,
} from "@/lib/candidatura-status";
import type { EtapaFunil } from "./types";

type SessaoLike = {
  etapa_funil: string | null;
  etapa_atual: string | null;
  status: string | null;
  ultima_inbound_at: string | null;
  ultima_outbound_at: string | null;
  primeira_resposta_at: string | null;
};

type CandidaturaLike = {
  status?: string | null;
  motivo_reprovacao?: string | null;
};

/**
 * Fonte da verdade: candidaturas.status → etapa-mãe.
 * Fallback só se candidatura sem status (legado).
 */
export function inferirEtapaFunil(
  sessao: SessaoLike,
  candidatura: CandidaturaLike | null,
  _analise?: { score_pos_entrevista?: number | null } | null
): EtapaFunil {
  const fromCand = etapaFromStatus(candidatura?.status ?? null);
  if (fromCand) return fromCand;

  const fromSessao = etapaFromStatus(sessao.etapa_funil);
  if (fromSessao) return fromSessao;

  // Legado etapa_funil antiga (respondeu, interessado…)
  const legacy = String(sessao.etapa_funil ?? "").trim();
  if (legacy === "respondeu" || legacy === "interessado" || legacy === "inativo") return "abordado";
  if (legacy === "reprovado" || legacy === "desistiu") return "abordado";

  if (sessao.ultima_inbound_at || sessao.primeira_resposta_at) return "abordado";
  if (sessao.ultima_outbound_at) return "abordado";
  return "inscrito";
}

export function statusDetalhadoFromCandidatura(
  candidatura: CandidaturaLike | null
): CandidaturaStatus | null {
  return normalizeCandidaturaStatus(candidatura?.status ?? null);
}

export function proximaEtapaFunil(atual: EtapaFunil): EtapaFunil | null {
  const i = CANDIDATURA_ETAPAS.indexOf(atual);
  if (i < 0 || i >= CANDIDATURA_ETAPAS.length - 1) return null;
  return CANDIDATURA_ETAPAS[i + 1];
}

export function statusDot(
  etapa: EtapaFunil,
  precisaResp: boolean,
  diasInativo: number,
  statusDetalhado?: CandidaturaStatus | null
): "green" | "amber" | "red" | "gray" {
  const s = statusDetalhado ?? null;
  if (
    s === "inscrito_reprovado" ||
    s === "inscrito_falha" ||
    s === "abordado_reprovado_sem_resposta" ||
    s === "abordado_negativa" ||
    s === "qualificado_reprovado_entrevista" ||
    s === "encaminhado_reprovado"
  ) {
    return "red";
  }
  if (etapa === "contratado" || etapa === "encaminhado") return "green";
  if (precisaResp || s === "abordado_em_conversa" || s === "abordado_sem_resposta") return "amber";
  if (diasInativo >= 3) return "red";
  if (etapa === "inscrito") return "gray";
  return "green";
}

export function isEtapaFunil(v: string): v is EtapaFunil {
  return (CANDIDATURA_ETAPAS as readonly string[]).includes(v);
}

export function defaultStatusDetalhado(): CandidaturaStatus {
  return CANDIDATURA_STATUS_INICIAL;
}

export type { CandidaturaEtapa };
