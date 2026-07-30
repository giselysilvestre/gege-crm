import type { CrmCandidatoRow, CrmMetrics } from "./types";
import { isCandidaturaMorta } from "@/lib/candidatura-status";

/** Cálculo leve no browser (fallback quando a API não devolve métricas). */
export function buildMetricsFromRows(
  rows: CrmCandidatoRow[],
  todos = rows.length
): CrmMetrics {
  const abordados = rows.filter(
    (r) =>
      r.ultima_outbound_at ||
      ["abordado", "qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const responderam = rows.filter(
    (r) =>
      r.ultima_inbound_at ||
      r.status_detalhado === "abordado_em_conversa" ||
      r.status_detalhado === "abordado_avancar" ||
      ["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const interessados = rows.filter(
    (r) =>
      r.status_detalhado === "abordado_avancar" ||
      ["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const qualificados = rows.filter((r) =>
    ["qualificado", "encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const encaminhados = rows.filter((r) =>
    ["encaminhado", "contratado"].includes(r.etapa_funil)
  ).length;
  const reprovados = rows.filter((r) =>
    isCandidaturaMorta(r.status_detalhado ?? r.candidatura_status)
  ).length;
  const pct = (n: number, base: number) => (base > 0 ? Math.round((n / base) * 100) : 0);

  return {
    todos,
    abordados,
    responderam,
    interessados,
    qualificados,
    encaminhados,
    reprovados,
    pct_responderam: pct(responderam, abordados),
    pct_interessados: pct(interessados, abordados),
    pct_qualificados: pct(qualificados, abordados),
    pct_encaminhados: pct(encaminhados, abordados),
  };
}
