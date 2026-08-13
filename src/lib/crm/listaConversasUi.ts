import { isCandidaturaMorta } from "@/lib/candidatura-status";
import { ETAPA_LABELS, type CrmCandidatoRow, type EtapaFunil } from "./types";

/**
 * Regras fixas da lista Conversas — docs/crm-lista-conversas.md
 * Não usar STATUS_DETALHADO_LABELS na lista lateral (exceto pill reprovado).
 */
export function labelEtapaLista(etapa: EtapaFunil): string {
  return ETAPA_LABELS[etapa].toLowerCase();
}

export function labelEtapaListaRow(row: CrmCandidatoRow): string {
  if (isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status)) {
    return "reprovado";
  }
  return labelEtapaLista(row.etapa_funil);
}

export function listaStatusClassRow(row: CrmCandidatoRow): string {
  if (isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status)) {
    return "lista-status-reprovado";
  }
  return `lista-status-${row.etapa_funil.replace(/_/g, "-")}`;
}

/** Interlocutor humano na lista: só contato_humano_por (Em contato). Ana não aparece. */
export function interlocutorLista(contatoHumanoPor: string | null): string | null {
  const nome = contatoHumanoPor?.trim();
  return nome ? nome : null;
}

/** Verde: não abriu a conversa e candidato falou por último (sem resposta nossa). */
export function listaItemAguardandoResposta(aberta: boolean, precisaResposta: boolean): boolean {
  return !aberta && precisaResposta;
}

/** Não visualizado = nunca abriu no CRM ou inbound novo depois da última visualização. */
export function isConversaNaoVisualizada(row: CrmCandidatoRow): boolean {
  const viz = row.crm_visualizado_em;
  if (!viz) return true;
  const inbound = row.ultima_inbound_at;
  if (!inbound) return false;
  return Date.parse(inbound) > Date.parse(viz);
}

/** Outbound enviado por humano no CRM → ícone pessoa; demais outbound → robô. */
export function isOutboundHumanoCrm(direcao: string, tipoMensagem: string | null): boolean {
  return direcao === "outbound" && tipoMensagem === "manual_crm";
}
