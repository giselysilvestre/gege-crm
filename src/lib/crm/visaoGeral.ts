import type { CrmCandidatoRow, CrmDashboard, CrmMetrics, EtapaFunil } from "./types";
import { ETAPA_LABELS, FUNIL_PRINCIPAL } from "./types";
import { JANELA_WHATSAPP_MS } from "./format";
import { isCandidaturaMorta } from "@/lib/candidatura-status";

export type MetricasDia = {
  conversas_ativas: number;
  abordados_hoje: number;
  abordados_hoje_pct_resposta: number;
  qualificados: number;
  encaminhados_hoje: number;
  qualificados_de: number;
};

export type MetricasPeriodo = {
  abordados: number;
  respondidos: number;
  pct_respondidos: number;
  encaminhados: number;
  pct_encaminhados: number;
  contratados: number;
  pct_contratados: number;
  pct_conversao_total: number;
};

export type FunilProgressaoStep = {
  etapa: EtapaFunil;
  label: string;
  count: number;
  pct_para_proximo: number | null;
};

export type CandidatoProntoCliente = {
  sessao_id: string;
  nome: string;
  vaga_nome: string;
  etapa_funil: EtapaFunil;
  etapa_label: string;
  score_cv: number | null;
  score_entrevista: number | null;
  tags: string[];
};

export type VisaoGeralModel = {
  metricas_dia: MetricasDia;
  metricas_periodo: MetricasPeriodo;
  funil_progressao: FunilProgressaoStep[];
  prontos_cliente: CandidatoProntoCliente[];
};

const ETAPAS_FORA_PIPELINE = new Set<EtapaFunil>(["contratado"]);

function pct(n: number, base: number) {
  return base > 0 ? Math.round((n / base) * 1000) / 10 : 0;
}

function isSameLocalDay(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isConversaAtiva(row: CrmCandidatoRow, agora = Date.now()): boolean {
  if (row.status_sessao !== "ativo") return false;
  if (ETAPAS_FORA_PIPELINE.has(row.etapa_funil)) return false;
  if (isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status)) return false;
  if (!row.ultima_data) return false;
  const t = Date.parse(row.ultima_data);
  if (Number.isNaN(t)) return false;
  return agora - t < JANELA_WHATSAPP_MS;
}

function isAbordadoHoje(row: CrmCandidatoRow): boolean {
  return isSameLocalDay(row.sessao_criado_em) || isSameLocalDay(row.ultima_outbound_at);
}

function isEncaminhadoHoje(row: CrmCandidatoRow): boolean {
  if (row.sessao_etapa_funil !== "encaminhado" && row.etapa_funil !== "encaminhado") return false;
  return (
    isSameLocalDay(row.sessao_atualizado_em) || isSameLocalDay(row.candidatura_atualizado_em)
  );
}

function isAbordado(row: CrmCandidatoRow): boolean {
  return (
    Boolean(row.ultima_outbound_at) ||
    ["abordado", "qualificado", "encaminhado", "contratado"].includes(row.etapa_funil)
  );
}

function isRespondido(row: CrmCandidatoRow): boolean {
  return (
    Boolean(row.ultima_inbound_at) ||
    row.status_detalhado === "abordado_em_conversa" ||
    row.status_detalhado === "abordado_avancar" ||
    ["qualificado", "encaminhado", "contratado"].includes(row.etapa_funil)
  );
}

function countFunilEtapa(rows: CrmCandidatoRow[], etapa: EtapaFunil): number {
  switch (etapa) {
    case "inscrito":
      return rows.filter((r) => r.etapa_funil === "inscrito").length;
    case "abordado":
      return rows.filter((r) => r.etapa_funil === "abordado" || isAbordado(r)).filter(
        (r) => !["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
      ).length;
    case "qualificado":
      return rows.filter((r) =>
        ["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
      ).length;
    case "encaminhado":
      return rows.filter((r) => ["encaminhado", "contratado"].includes(r.etapa_funil)).length;
    case "contratado":
      return rows.filter((r) => r.etapa_funil === "contratado").length;
    default:
      return 0;
  }
}

export function buildVisaoGeralModel(
  rows: CrmCandidatoRow[],
  _metrics: CrmMetrics | null,
  _dashboard: CrmDashboard | null
): VisaoGeralModel {
  const ativas = rows.filter(isConversaAtiva);
  const abordadosHoje = rows.filter(isAbordadoHoje);
  const qualificadosDia = abordadosHoje.filter((r) =>
    ["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const respondidosAbordadosHoje = abordadosHoje.filter(isRespondido).length;

  const abordadosPeriodo = rows.filter(isAbordado).length;
  const respondidosPeriodo = rows.filter(isRespondido).length;
  const encaminhadosPeriodo = rows.filter((r) =>
    ["encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const contratadosPeriodo = rows.filter((r) => r.etapa_funil === "contratado").length;

  const funilCounts = FUNIL_PRINCIPAL.map((etapa) => ({
    etapa,
    label: ETAPA_LABELS[etapa].toLowerCase(),
    count: countFunilEtapa(rows, etapa),
  }));

  const funil_progressao: FunilProgressaoStep[] = funilCounts.map((step, i) => {
    const next = funilCounts[i + 1];
    return {
      etapa: step.etapa,
      label: step.label,
      count: step.count,
      pct_para_proximo: next ? pct(next.count, step.count || 1) : null,
    };
  });

  const prontos_cliente: CandidatoProntoCliente[] = rows
    .filter(
      (r) =>
        r.status_sessao === "ativo" &&
        (r.status_detalhado === "abordado_avancar" || r.etapa_funil === "qualificado") &&
        !isCandidaturaMorta(r.status_detalhado)
    )
    .sort((a, b) => {
      const rank = (e: EtapaFunil) => (e === "qualificado" ? 0 : 1);
      const dr = rank(a.etapa_funil) - rank(b.etapa_funil);
      if (dr !== 0) return dr;
      return (b.score_cv ?? -1) - (a.score_cv ?? -1);
    })
    .slice(0, 12)
    .map((r) => ({
      sessao_id: r.sessao_id,
      nome: r.candidato_nome,
      vaga_nome: r.vaga_nome,
      etapa_funil: r.etapa_funil,
      etapa_label: r.status_detalhado
        ? String(r.status_detalhado)
        : ETAPA_LABELS[r.etapa_funil],
      score_cv: r.score_cv,
      score_entrevista: r.score_entrevista,
      tags: r.tags,
    }));

  return {
    metricas_dia: {
      conversas_ativas: ativas.length,
      abordados_hoje: abordadosHoje.length,
      abordados_hoje_pct_resposta: pct(respondidosAbordadosHoje, abordadosHoje.length),
      qualificados: qualificadosDia,
      encaminhados_hoje: rows.filter(isEncaminhadoHoje).length,
      qualificados_de: abordadosHoje.length,
    },
    metricas_periodo: {
      abordados: abordadosPeriodo,
      respondidos: respondidosPeriodo,
      pct_respondidos: pct(respondidosPeriodo, abordadosPeriodo),
      encaminhados: encaminhadosPeriodo,
      pct_encaminhados: pct(encaminhadosPeriodo, respondidosPeriodo),
      contratados: contratadosPeriodo,
      pct_contratados: pct(contratadosPeriodo, encaminhadosPeriodo || respondidosPeriodo),
      pct_conversao_total: pct(contratadosPeriodo, abordadosPeriodo),
    },
    funil_progressao,
    prontos_cliente,
  };
}
