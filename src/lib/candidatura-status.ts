/**
 * Funil canônico Gegê — fonte da verdade: candidaturas.status
 * 5 etapas-mãe + 15 status detalhados (sem qualificado_pendente_entrevista).
 */

export const CANDIDATURA_ETAPAS = [
  "inscrito",
  "abordado",
  "qualificado",
  "encaminhado",
  "contratado",
] as const;

export type CandidaturaEtapa = (typeof CANDIDATURA_ETAPAS)[number];

export const CANDIDATURA_STATUSES = [
  "inscrito_aguardando_disparo",
  "inscrito_avancar",
  "inscrito_reprovado",
  "inscrito_falha",
  "abordado_sem_resposta",
  "abordado_em_conversa",
  "abordado_avancar",
  "abordado_reprovado_sem_resposta",
  "abordado_negativa",
  "qualificado_avancar",
  "qualificado_reprovado_entrevista",
  "encaminhado_aguardando",
  "encaminhado_avancar",
  "encaminhado_reprovado",
  "contratado",
] as const;

export type CandidaturaStatus = (typeof CANDIDATURA_STATUSES)[number];

export const CANDIDATURA_STATUS_LABELS: Record<CandidaturaStatus, string> = {
  inscrito_aguardando_disparo: "Aguardando disparo",
  inscrito_avancar: "Avançar (triagem)",
  inscrito_reprovado: "Reprovado (triagem)",
  inscrito_falha: "Falha no disparo",
  abordado_sem_resposta: "Sem resposta (FUP)",
  abordado_em_conversa: "Em conversa",
  abordado_avancar: "Interessado",
  abordado_reprovado_sem_resposta: "Reprovado (sem resposta)",
  abordado_negativa: "Recusou",
  qualificado_avancar: "Qualificado",
  qualificado_reprovado_entrevista: "Reprovado (entrevista)",
  encaminhado_aguardando: "Encaminhado (aguarda cliente)",
  encaminhado_avancar: "Cliente aprovou",
  encaminhado_reprovado: "Cliente recusou",
  contratado: "Contratado",
};

export const CANDIDATURA_ETAPA_LABELS: Record<CandidaturaEtapa, string> = {
  inscrito: "Inscrito",
  abordado: "Abordado",
  qualificado: "Qualificado",
  encaminhado: "Encaminhado",
  contratado: "Contratado",
};

/** Status de entrada ao dropar na coluna-mãe (Kanban). */
export const STATUS_ENTRADA_POR_ETAPA: Record<CandidaturaEtapa, CandidaturaStatus> = {
  inscrito: "inscrito_aguardando_disparo",
  abordado: "abordado_em_conversa",
  qualificado: "qualificado_avancar",
  encaminhado: "encaminhado_aguardando",
  contratado: "contratado",
};

export const CANDIDATURA_DEATH_TERMINAL_STATUSES = [
  "inscrito_reprovado",
  "inscrito_falha",
  "abordado_reprovado_sem_resposta",
  "abordado_negativa",
  "qualificado_reprovado_entrevista",
  "encaminhado_reprovado",
] as const satisfies readonly CandidaturaStatus[];

const LEGACY_STATUS_MAP: Record<string, CandidaturaStatus> = {
  inscrito: "inscrito_aguardando_disparo",
  novo: "inscrito_aguardando_disparo",
  em_triagem: "inscrito_aguardando_disparo",
  movido: "inscrito_aguardando_disparo",
  abordado: "abordado_sem_resposta",
  respondeu: "abordado_em_conversa",
  interessado: "abordado_avancar",
  inativo: "abordado_reprovado_sem_resposta",
  qualificado: "qualificado_avancar",
  em_entrevista: "qualificado_avancar",
  entrevista: "qualificado_avancar",
  entrevistado: "qualificado_avancar",
  qualificado_pendente_entrevista: "qualificado_avancar",
  encaminhado: "encaminhado_aguardando",
  em_teste: "encaminhado_aguardando",
  teste: "encaminhado_aguardando",
  aprovado: "encaminhado_avancar",
  aprovado_teste: "encaminhado_avancar",
  contratado: "contratado",
  reprovado: "inscrito_reprovado",
  desistiu: "abordado_negativa",
};

const REPROVADO_POR_ETAPA: Record<Exclude<CandidaturaEtapa, "contratado">, CandidaturaStatus> = {
  inscrito: "inscrito_reprovado",
  abordado: "abordado_negativa",
  qualificado: "qualificado_reprovado_entrevista",
  encaminhado: "encaminhado_reprovado",
};

export const CANDIDATURA_STATUS_INICIAL = "inscrito_aguardando_disparo" as const satisfies CandidaturaStatus;
export const CANDIDATURA_STATUS_DESISTENCIA = "abordado_negativa" as const satisfies CandidaturaStatus;
export const CANDIDATURA_STATUS_ENCAMINHADO_AGUARDANDO =
  "encaminhado_aguardando" as const satisfies CandidaturaStatus;

export function normalizeCandidaturaStatus(raw: string | null | undefined): CandidaturaStatus | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if ((CANDIDATURA_STATUSES as readonly string[]).includes(s)) return s as CandidaturaStatus;
  return LEGACY_STATUS_MAP[s] ?? null;
}

export function etapaFromStatus(raw: string | null | undefined): CandidaturaEtapa | null {
  const s = normalizeCandidaturaStatus(raw) ?? String(raw ?? "").trim();
  if (!s) return null;
  const prefix = s.split("_", 1)[0];
  if ((CANDIDATURA_ETAPAS as readonly string[]).includes(prefix)) return prefix as CandidaturaEtapa;
  return null;
}

export function statusesForEtapa(etapa: CandidaturaEtapa): readonly CandidaturaStatus[] {
  return CANDIDATURA_STATUSES.filter((s) => s === etapa || s.startsWith(`${etapa}_`));
}

export function candidaturaStatusLabel(raw: string | null | undefined): string {
  const s = normalizeCandidaturaStatus(raw);
  if (s) return CANDIDATURA_STATUS_LABELS[s];
  const rawTrim = String(raw ?? "").trim();
  return rawTrim || "—";
}

function isDeathTerminalStatus(s: CandidaturaStatus): boolean {
  return (CANDIDATURA_DEATH_TERMINAL_STATUSES as readonly string[]).includes(s);
}

export function isCandidaturaTerminal(raw: string | null | undefined): boolean {
  const s = normalizeCandidaturaStatus(raw);
  if (!s) return false;
  return isDeathTerminalStatus(s) || s === "contratado";
}

export function isCandidaturaMorta(raw: string | null | undefined): boolean {
  const s = normalizeCandidaturaStatus(raw);
  if (!s) return false;
  return isDeathTerminalStatus(s);
}

export function reprovadoStatusForEtapa(raw: string | null | undefined): CandidaturaStatus | null {
  const etapa = etapaFromStatus(raw);
  if (!etapa || etapa === "contratado") return null;
  return REPROVADO_POR_ETAPA[etapa];
}

/** Avançar manual: entrada da próxima etapa-mãe. */
export function nextCandidaturaStatus(current: string | null | undefined): CandidaturaStatus | null {
  const s = normalizeCandidaturaStatus(current);
  if (!s || isCandidaturaTerminal(s)) return null;
  const etapa = etapaFromStatus(s);
  switch (etapa) {
    case "inscrito":
      return "abordado_sem_resposta";
    case "abordado":
      return "qualificado_avancar";
    case "qualificado":
      return "encaminhado_aguardando";
    case "encaminhado":
      return "contratado";
    default:
      return null;
  }
}

/** Espelho em whatsapp_sessoes.etapa_funil (compat) = etapa-mãe. */
export function etapaFunilMirror(raw: string | null | undefined): CandidaturaEtapa | null {
  return etapaFromStatus(raw);
}
