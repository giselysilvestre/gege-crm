import {
  CANDIDATURA_ETAPA_LABELS,
  CANDIDATURA_ETAPAS,
  CANDIDATURA_STATUS_LABELS,
  CANDIDATURA_STATUSES,
  type CandidaturaEtapa,
  type CandidaturaStatus,
} from "@/lib/candidatura-status";

export type CrmViewId = "kanban" | "conversas" | "funil" | "alertas";

/** Etapas-mãe (Kanban / filtro simples). */
export const FUNIL_ETAPAS = CANDIDATURA_ETAPAS;
export type EtapaFunil = CandidaturaEtapa;

export const FUNIL_PRINCIPAL: EtapaFunil[] = [...CANDIDATURA_ETAPAS];

/** Sem colunas laterais de saída — mortos ficam na etapa-mãe. */
export const FUNIL_SAIDAS: EtapaFunil[] = [];

/** Opção extra no modal “Mudar etapa” (não é etapa-mãe do funil). */
export const ETAPA_DESTINO_REPROVADO = "reprovado" as const;
export type EtapaDestinoModal = EtapaFunil | typeof ETAPA_DESTINO_REPROVADO;

export const ETAPA_LABELS: Record<EtapaFunil, string> = { ...CANDIDATURA_ETAPA_LABELS };

export const ETAPA_BADGE_CLASS: Record<EtapaFunil, string> = {
  inscrito: "badge-gray",
  abordado: "badge-blue",
  qualificado: "badge-purple",
  encaminhado: "badge-teal",
  contratado: "badge-green",
};

export const STATUS_DETALHADO_LIST = CANDIDATURA_STATUSES;
export type StatusDetalhado = CandidaturaStatus;
export const STATUS_DETALHADO_LABELS = CANDIDATURA_STATUS_LABELS;

export const MOTIVOS_REPROVACAO = [
  { value: "score_entrevista", label: "Score entrevista" },
  { value: "distancia", label: "Distância" },
  { value: "horario", label: "Horário" },
  { value: "desistiu", label: "Desistiu" },
  { value: "eliminatorio", label: "Eliminatório" },
] as const;

export type MotivoReprovacao = (typeof MOTIVOS_REPROVACAO)[number]["value"];

export const CRM_TEMPLATES_WHATSAPP = [
  { value: "fup_mensagem", label: "FUP — oiii, não esquece de me responder?" },
  { value: "abordagem_candidatura_gege", label: "Abordagem inicial (nome + vaga)" },
] as const;

export type CrmTemplateWhatsapp = (typeof CRM_TEMPLATES_WHATSAPP)[number]["value"];

export type VagaOption = {
  id: string;
  label: string;
  cargo: string;
  cliente_id: string;
  cliente_nome: string;
  titulo: string | null;
};

export type CandidatoExperiencia = {
  empresa: string;
  cargo: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  meses: number | null;
};

export type CrmCandidatoRow = {
  sessao_id: string;
  candidato_id: string;
  candidatura_id: string | null;
  candidato_nome: string;
  telefone: string | null;
  /** Etapa-mãe derivada de candidaturas.status. */
  etapa_funil: EtapaFunil;
  /** Status detalhado canônico (fonte da verdade). */
  status_detalhado: CandidaturaStatus | null;
  etapa_atual: string | null;
  status_sessao: string | null;
  vaga_id: string | null;
  vaga_nome: string;
  score_cv: number | null;
  score_entrevista: number | null;
  distancia_km: number | null;
  cidade: string | null;
  bairro: string | null;
  regiao: string | null;
  data_nascimento: string | null;
  disponibilidade: string | null;
  situacao: string | null;
  tags: string[];
  ultima_mensagem: string | null;
  ultima_direcao: "inbound" | "outbound" | null;
  ultima_data: string | null;
  ultima_inbound_at: string | null;
  ultima_outbound_at: string | null;
  precisa_resposta: boolean;
  status_dot: "green" | "gray";
  resumo_ia: string | null;
  perfil_resumo: string | null;
  analise_completa: string | null;
  experiencias_cv: CandidatoExperiencia[];
  curriculo_url: string | null;
  reativacao_enviada: boolean;
  motivo_reprovacao: string | null;
  candidatura_status: string | null;
  favorito_crm: boolean;
  sessao_criado_em: string | null;
  sessao_etapa_funil: string | null;
  sessao_atualizado_em: string | null;
  candidatura_atualizado_em: string | null;
  /** Primeiro nome de quem marcou Em contato (manual, nesta vaga). */
  contato_humano_por: string | null;
};

export type CrmMetrics = {
  todos: number;
  abordados: number;
  responderam: number;
  interessados: number;
  qualificados: number;
  encaminhados: number;
  reprovados: number;
  pct_responderam: number;
  pct_interessados: number;
  pct_qualificados: number;
  pct_encaminhados: number;
};

export type CrmDashboard = {
  taxa_resposta: number;
  taxa_qualificacao: number;
  tempo_medio_qualificado_horas: number | null;
  funil_counts: Record<EtapaFunil, number>;
  atividade_7d: { dia: string; inbound: number; outbound: number }[];
  motivos_reprovacao: { motivo: string; count: number }[];
};

export type WhatsappMessage = {
  id: string;
  direcao: "inbound" | "outbound";
  conteudo: string | null;
  criado_em: string;
  tipo_mensagem: string | null;
};
