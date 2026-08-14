import {
  CANDIDATURA_ETAPAS,
  CANDIDATURA_STATUS_INICIAL,
  etapaFromStatus,
  isCandidaturaMorta,
  normalizeCandidaturaStatus,
  type CandidaturaEtapa,
  type CandidaturaStatus,
} from "@/lib/candidatura-status";
import type { EtapaFunil } from "./types";

type SessaoLike = {
  etapa_funil?: string | null;
  etapa_atual?: string | null;
  status?: string | null;
  ultima_inbound_at?: string | null;
  ultima_outbound_at?: string | null;
  primeira_resposta_at?: string | null;
};

/** Sessão com pelo menos uma msg registrada (in/out). Sessão vazia = inscrito. */
export function sessaoTemHistoricoMensagem(sessao: SessaoLike): boolean {
  return Boolean(
    sessao.ultima_inbound_at || sessao.ultima_outbound_at || sessao.primeira_resposta_at
  );
}

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
  const temMsg = sessaoTemHistoricoMensagem(sessao);

  if (fromCand && fromCand !== "inscrito" && !temMsg) {
    return "inscrito";
  }
  if (fromCand) return fromCand;

  const fromSessao = etapaFromStatus(sessao.etapa_funil);
  if (fromSessao) {
    if (fromSessao === "inscrito" || temMsg) return fromSessao;
    return "inscrito";
  }

  // Legado etapa_funil antiga (respondeu, interessado…)
  const legacy = String(sessao.etapa_funil ?? "").trim();
  if (legacy === "respondeu" || legacy === "interessado" || legacy === "inativo") {
    return temMsg ? "abordado" : "inscrito";
  }
  if (legacy === "reprovado" || legacy === "desistiu") return temMsg ? "abordado" : "inscrito";

  if (temMsg) {
    if (sessao.ultima_inbound_at || sessao.primeira_resposta_at) return "abordado";
    if (sessao.ultima_outbound_at) return "abordado";
  }
  return "inscrito";
}

export function statusDetalhadoFromCandidatura(
  candidatura: CandidaturaLike | null
): CandidaturaStatus | null {
  return normalizeCandidaturaStatus(candidatura?.status ?? null);
}

/** Status exibido no CRM: sem msg na sessão, reprovação no banco não vale — ainda inscrito. */
export function statusDetalhadoExibicao(
  sessao: SessaoLike,
  candidatura: CandidaturaLike | null
): CandidaturaStatus | null {
  const raw = statusDetalhadoFromCandidatura(candidatura);
  if (!raw) return null;
  if (!sessaoTemHistoricoMensagem(sessao)) {
    if (isCandidaturaMorta(raw)) {
      return CANDIDATURA_STATUS_INICIAL;
    }
    const etapa = etapaFromStatus(raw);
    if (etapa && etapa !== "inscrito") {
      return CANDIDATURA_STATUS_INICIAL;
    }
  }
  return raw;
}

export function proximaEtapaFunil(atual: EtapaFunil): EtapaFunil | null {
  const i = CANDIDATURA_ETAPAS.indexOf(atual);
  if (i < 0 || i >= CANDIDATURA_ETAPAS.length - 1) return null;
  return CANDIDATURA_ETAPAS[i + 1];
}

export function isEtapaFunil(v: string): v is EtapaFunil {
  return (CANDIDATURA_ETAPAS as readonly string[]).includes(v);
}

export function defaultStatusDetalhado(): CandidaturaStatus {
  return CANDIDATURA_STATUS_INICIAL;
}

export type { CandidaturaEtapa };
