import { ETAPA_LABELS, type EtapaFunil } from "./types";

/**
 * Regras fixas da lista Conversas — docs/crm-lista-conversas.md
 * Não usar STATUS_DETALHADO_LABELS na lista lateral.
 */
export function labelEtapaLista(etapa: EtapaFunil): string {
  return ETAPA_LABELS[etapa].toLowerCase();
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

/** Outbound enviado por humano no CRM → ícone pessoa; demais outbound → robô. */
export function isOutboundHumanoCrm(direcao: string, tipoMensagem: string | null): boolean {
  return direcao === "outbound" && tipoMensagem === "manual_crm";
}
