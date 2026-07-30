import type { CrmCandidatoRow, CrmDashboard, CrmMetrics, EtapaFunil } from "./types";
import { ETAPA_LABELS, FUNIL_PRINCIPAL } from "./types";
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
const TZ = "America/Sao_Paulo";
/** Atualizações em lote (migration/reclassificação) não contam como ação "hoje". */
const BULK_MINUTE_THRESHOLD = 10;

const ETAPA_RANK: Record<EtapaFunil, number> = {
  inscrito: 0,
  abordado: 1,
  qualificado: 2,
  encaminhado: 3,
  contratado: 4,
};

function pct(n: number, base: number) {
  return base > 0 ? Math.round((n / base) * 1000) / 10 : 0;
}

function localDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function isSameLocalDay(iso: string | null | undefined): boolean {
  const key = localDayKey(iso);
  if (!key) return false;
  return key === localDayKey(new Date().toISOString());
}

function minuteKey(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 60_000);
}

/** Minutos com muitas atualizações juntas (= script no banco, não ação manual do dia). */
function bulkUpdateMinutes(rows: CrmCandidatoRow[]): Set<number> {
  const byMinute = new Map<number, number>();
  for (const r of rows) {
    const key = minuteKey(r.candidatura_atualizado_em);
    if (key == null) continue;
    byMinute.set(key, (byMinute.get(key) ?? 0) + 1);
  }
  const bulk = new Set<number>();
  for (const [min, count] of byMinute) {
    if (count >= BULK_MINUTE_THRESHOLD) bulk.add(min);
  }
  return bulk;
}

function isCrmActionToday(
  row: CrmCandidatoRow,
  bulkMinutes: Set<number>
): boolean {
  if (!isSameLocalDay(row.candidatura_atualizado_em)) return false;
  if (!isSameLocalDay(row.sessao_atualizado_em)) return false;
  const key = minuteKey(row.candidatura_atualizado_em);
  if (key != null && bulkMinutes.has(key)) return false;
  return true;
}

/** Pipeline vivo (sem reprovados) — prontos p/ cliente e janela 24h. */
function rowsFunilAtivos(rows: CrmCandidatoRow[]): CrmCandidatoRow[] {
  return rows.filter((r) => !isCandidaturaMorta(r.status_detalhado ?? r.candidatura_status));
}

function atingiuEtapa(row: CrmCandidatoRow, etapa: EtapaFunil): boolean {
  return ETAPA_RANK[row.etapa_funil] >= ETAPA_RANK[etapa];
}

function isAbordadoHistorico(row: CrmCandidatoRow): boolean {
  return Boolean(row.ultima_outbound_at) || atingiuEtapa(row, "abordado");
}

function isRespondidoHistorico(row: CrmCandidatoRow): boolean {
  if (!isAbordadoHistorico(row)) return false;
  return (
    Boolean(row.ultima_inbound_at) ||
    row.status_detalhado === "abordado_em_conversa" ||
    row.status_detalhado === "abordado_avancar" ||
    atingiuEtapa(row, "qualificado")
  );
}

/** Funil + métricas do período — mesma fonte (todas as candidaturas do CRM). */
export function countFunilEtapa(rows: CrmCandidatoRow[], etapa: EtapaFunil): number {
  if (etapa === "inscrito") return rows.length;
  if (etapa === "abordado") return rows.filter(isAbordadoHistorico).length;
  const minRank = ETAPA_RANK[etapa];
  return rows.filter((r) => ETAPA_RANK[r.etapa_funil] >= minRank).length;
}

function isConversaAtiva(row: CrmCandidatoRow): boolean {
  if (row.status_sessao !== "ativo") return false;
  if (ETAPAS_FORA_PIPELINE.has(row.etapa_funil)) return false;
  if (isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status)) return false;
  return row.status_dot === "green";
}

function isAbordadoHoje(row: CrmCandidatoRow): boolean {
  return isSameLocalDay(row.ultima_outbound_at);
}

function isRespondido(row: CrmCandidatoRow): boolean {
  if (!atingiuEtapa(row, "abordado")) return false;
  return (
    Boolean(row.ultima_inbound_at) ||
    row.status_detalhado === "abordado_em_conversa" ||
    row.status_detalhado === "abordado_avancar" ||
    atingiuEtapa(row, "qualificado")
  );
}

export function buildVisaoGeralModel(
  rows: CrmCandidatoRow[],
  _metrics: CrmMetrics | null,
  _dashboard: CrmDashboard | null
): VisaoGeralModel {
  const base = rowsFunilAtivos(rows);
  const bulkMinutes = bulkUpdateMinutes(rows);

  const abordadosHoje = rows.filter(isAbordadoHoje);
  const respondidosAbordadosHoje = abordadosHoje.filter(isRespondidoHistorico).length;

  const funilCounts = FUNIL_PRINCIPAL.map((etapa) => ({
    etapa,
    label: ETAPA_LABELS[etapa].toLowerCase(),
    count: countFunilEtapa(rows, etapa),
  }));

  const abordadosPeriodo = funilCounts.find((f) => f.etapa === "abordado")?.count ?? 0;
  const encaminhadosPeriodo = funilCounts.find((f) => f.etapa === "encaminhado")?.count ?? 0;
  const contratadosPeriodo = funilCounts.find((f) => f.etapa === "contratado")?.count ?? 0;
  const respondidosPeriodo = rows.filter(isRespondidoHistorico).length;

  const funil_progressao: FunilProgressaoStep[] = funilCounts.map((step, i) => {
    const next = funilCounts[i + 1];
    const prev = funilCounts[i - 1];

    let pctProximo: number | null = null;
    if (next && step.count > 0) {
      pctProximo = Math.min(100, pct(next.count, step.count));
    } else if (step.etapa === "contratado" && prev && prev.count > 0) {
      pctProximo = pct(step.count, prev.count);
    }

    return {
      etapa: step.etapa,
      label: step.label,
      count: step.count,
      pct_para_proximo: pctProximo,
    };
  });

  const prontos_cliente: CandidatoProntoCliente[] = base
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

  const qualificadosHoje = rows.filter(
    (r) =>
      r.etapa_funil === "qualificado" &&
      r.status_detalhado === "qualificado_avancar" &&
      isCrmActionToday(r, bulkMinutes)
  ).length;

  const encaminhadosHoje = rows.filter(
    (r) =>
      r.etapa_funil === "encaminhado" &&
      r.status_detalhado === "encaminhado_aguardando" &&
      isCrmActionToday(r, bulkMinutes)
  ).length;

  return {
    metricas_dia: {
      conversas_ativas: base.filter(isConversaAtiva).length,
      abordados_hoje: abordadosHoje.length,
      abordados_hoje_pct_resposta: pct(respondidosAbordadosHoje, abordadosHoje.length),
      qualificados: qualificadosHoje,
      encaminhados_hoje: encaminhadosHoje,
      qualificados_de: abordadosHoje.length,
    },
    metricas_periodo: {
      abordados: abordadosPeriodo,
      respondidos: respondidosPeriodo,
      pct_respondidos: pct(respondidosPeriodo, abordadosPeriodo),
      encaminhados: encaminhadosPeriodo,
      pct_encaminhados: pct(encaminhadosPeriodo, respondidosPeriodo),
      contratados: contratadosPeriodo,
      pct_contratados: pct(contratadosPeriodo, encaminhadosPeriodo),
      pct_conversao_total: pct(contratadosPeriodo, abordadosPeriodo),
    },
    funil_progressao,
    prontos_cliente,
  };
}
