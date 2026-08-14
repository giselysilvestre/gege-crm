import { isCandidaturaMorta } from "@/lib/candidatura-status";
import { ETAPA_DESTINO_REPROVADO, type EtapaFunil, type CrmCandidatoRow } from "./types";

export type FiltroEtapaLista = EtapaFunil | typeof ETAPA_DESTINO_REPROVADO | "";

export function rowMorta(row: CrmCandidatoRow): boolean {
  return isCandidaturaMorta(row.status_detalhado ?? row.candidatura_status);
}

/** Todas etapas = só ativos. Etapa X = X sem reprovados. Reprovado = só mortos. */
export function matchFiltroEtapaLista(row: CrmCandidatoRow, filtro: FiltroEtapaLista): boolean {
  const morta = rowMorta(row);
  if (filtro === ETAPA_DESTINO_REPROVADO) return morta;
  if (!filtro) return !morta;
  return row.etapa_funil === filtro && !morta;
}

/** Data usada no filtro de período — alinhada à ordenação “Mais recente”. */
export function timestampListaRow(row: CrmCandidatoRow): number | null {
  const raw = row.ultima_data ?? row.sessao_criado_em ?? row.candidatura_atualizado_em;
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

/** Converte "YYYY-MM-DD" do input date para meia-noite no fuso local (evita bug UTC). */
function inicioDiaLocal(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function fimDiaLocal(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

export function matchFiltroData(row: CrmCandidatoRow, de: string, ate: string): boolean {
  if (!de && !ate) return true;
  const t = timestampListaRow(row);
  if (t == null) return false;
  if (de && t < inicioDiaLocal(de)) return false;
  if (ate && t > fimDiaLocal(ate)) return false;
  return true;
}
