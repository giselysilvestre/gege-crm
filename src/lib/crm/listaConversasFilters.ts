import { isCandidaturaMorta } from "@/lib/candidatura-status";
import type { CrmCandidatoRow } from "./types";

export type FiltroReprovados = "ativos" | "so_reprovados" | "todos";

export function rowMorta(row: CrmCandidatoRow): boolean {
  return isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status);
}

export function matchFiltroReprovados(row: CrmCandidatoRow, filtro: FiltroReprovados): boolean {
  const morta = rowMorta(row);
  if (filtro === "ativos") return !morta;
  if (filtro === "so_reprovados") return morta;
  return true;
}

/** Data usada no filtro de período — alinhada à ordenação “Mais recente”. */
export function timestampListaRow(row: CrmCandidatoRow): number | null {
  const raw = row.ultima_data ?? row.sessao_criado_em ?? row.candidatura_atualizado_em;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export function matchFiltroData(row: CrmCandidatoRow, de: string, ate: string): boolean {
  if (!de && !ate) return true;
  const t = timestampListaRow(row);
  if (t == null) return false;
  if (de) {
    const start = new Date(de);
    start.setHours(0, 0, 0, 0);
    if (t < start.getTime()) return false;
  }
  if (ate) {
    const end = new Date(ate);
    end.setHours(23, 59, 59, 999);
    if (t > end.getTime()) return false;
  }
  return true;
}
