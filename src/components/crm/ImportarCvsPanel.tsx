"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VagaOption } from "@/lib/crm/types";
import { readJsonResponse } from "@/lib/parseJsonResponse";

const MAX_FILES = 100;
const DELAY_MS = 300;

type FileItem = {
  id: string;
  file: File;
  status: "pending" | "processing" | "done" | "error";
  message?: string;
  candidatoId?: string;
  nome?: string;
  scoreIa?: number | null;
  startedAt?: number;
  elapsedMs?: number;
};

type ImportResponse = {
  ok?: boolean;
  error?: string;
  status?: string;
  candidatoId?: string;
  nome?: string;
  scoreIa?: number | null;
  message?: string;
};

type AllocateResponse = {
  ok?: boolean;
  error?: string;
  inseridos?: number;
  movidos?: number;
  jaNaVaga?: number;
  semAnalise?: number;
  erros?: { candidatoId: string; error: string }[];
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatFeedbackError(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object") {
    const o = raw as { message?: unknown; details?: unknown };
    if (typeof o.message === "string") return o.message;
    if (typeof o.details === "string") return o.details;
  }
  return String(raw);
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
}

function IconUploadSmall() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0 4 4m-4-4-4 4M5 20h14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ImportarCvsPanel({ vagas }: { vagas: VagaOption[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [batchId] = useState(() => `crm-${Date.now()}`);
  const [origem, setOrigem] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "allocate">("upload");
  const [vagaId, setVagaId] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const hasProcessing = items.some((it) => it.status === "processing");

  useEffect(() => {
    if (!processing && !hasProcessing) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [processing, hasProcessing]);

  const onPickFiles = useCallback((list: FileList | null) => {
    if (!list?.length) return;
    const pdfs = Array.from(list).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    const limited = pdfs.slice(0, MAX_FILES);
    setItems(
      limited.map((file, i) => ({
        id: `${file.name}-${file.size}-${i}`,
        file,
        status: "pending",
      }))
    );
    setStep("upload");
    setFeedback(
      pdfs.length > MAX_FILES
        ? `Foram selecionados ${pdfs.length} PDFs — processaremos os primeiros ${MAX_FILES}.`
        : null
    );
  }, []);

  const successIds = useMemo(
    () =>
      items
        .filter((it) => it.status === "done" && it.candidatoId)
        .map((it) => it.candidatoId as string),
    [items]
  );

  const doneCount = items.filter((it) => it.status === "done" || it.status === "error").length;

  async function processAll() {
    if (items.length === 0 || processing) return;
    setProcessing(true);
    setFeedback(null);
    const origemFinal = origem.trim() || `Import CRM ${batchId}`;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const startedAt = Date.now();
      setItems((prev) =>
        prev.map((r) =>
          r.id === item.id ? { ...r, status: "processing", message: undefined, startedAt, elapsedMs: undefined } : r
        )
      );

      try {
        const form = new FormData();
        form.set("file", item.file);
        form.set("batchId", batchId);
        form.set("origem", origemFinal);

        const res = await fetch("/api/cvs/import", { method: "POST", body: form });
        const json = await readJsonResponse<ImportResponse>(res);
        if (!res.ok) throw new Error(json.error ?? "Falha na importação");
        const elapsedMs = Date.now() - startedAt;

        setItems((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  status: "done",
                  candidatoId: json.candidatoId,
                  nome: json.nome,
                  scoreIa: json.scoreIa ?? null,
                  elapsedMs,
                  message:
                    json.message ??
                    (json.status === "skipped_duplicate"
                      ? "Já existia"
                      : json.status === "inserted"
                        ? "Salvo"
                        : "Ok"),
                }
              : r
          )
        );
      } catch (e) {
        const elapsedMs = Date.now() - startedAt;
        setItems((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? {
                  ...r,
                  status: "error",
                  elapsedMs,
                  message: e instanceof Error ? e.message : String(e),
                }
              : r
          )
        );
      }

      if (i < items.length - 1) await sleep(DELAY_MS);
    }

    setProcessing(false);
    setStep("allocate");
    setFeedback("Análise concluída. Escolha a vaga e clique em Alocar.");
  }

  async function allocate() {
    if (!vagaId || successIds.length === 0 || allocating) return;
    setAllocating(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/cvs/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vagaId, candidatoIds: successIds }),
      });
      const json = await readJsonResponse<AllocateResponse>(res);
      if (!res.ok) throw new Error(json.error ?? "Erro ao alocar");

      const erros = json.erros?.length ?? 0;
      const semAnalise = json.semAnalise ?? 0;
      const parts = [
        `${json.inseridos ?? 0} inscrito(s)`,
        `${json.movidos ?? 0} movido(s)`,
        `${json.jaNaVaga ?? 0} já na vaga`,
      ];
      if (semAnalise > 0) parts.push(`${semAnalise} sem análise`);
      if (erros > 0) parts.push(`${erros} erro(s)`);
      let msg = parts.join(", ") + ".";

      if (erros > 0 && json.erros?.length) {
        const detalhes = json.erros
          .slice(0, 3)
          .map((e) => formatFeedbackError(e.error))
          .filter((t) => t && t !== "[object Object]")
          .join(" · ");
        if (detalhes) msg += ` ${detalhes}`;
        if (json.erros.length > 3) msg += " …";
      }

      setFeedback(msg);
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : String(e));
    } finally {
      setAllocating(false);
    }
  }

  return (
    <div className="import-cvs-view">
      <div className="import-cvs-panel crm-panel">
        <p className="import-cvs-lead">
          Selecione até {MAX_FILES} CVs para serem analisados e salvos no banco de talentos (formato
          obrigatório em PDF).
        </p>

        <div className="import-cvs-form">
          <label className="crm-filters-field import-cvs-field">
            Origem do lote (opcional)
            <input
              className="crm-toolbar-input"
              value={origem}
              onChange={(e) => setOrigem(e.target.value)}
              placeholder={`Import CRM ${batchId}`}
              disabled={processing}
            />
          </label>

          <div className="crm-filters-field import-cvs-field">
            <span>Arquivos PDF</span>
            <div className="import-cvs-drop">
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="import-cvs-file-input"
                onChange={(e) => onPickFiles(e.target.files)}
                disabled={processing}
              />
              <button
                type="button"
                className="btn-ghost import-cvs-pick-btn"
                disabled={processing}
                onClick={() => inputRef.current?.click()}
              >
                <IconUploadSmall />
                Escolher PDFs
              </button>
              <span className="import-cvs-file-hint">
                {items.length > 0
                  ? `${items.length} arquivo(s) selecionado(s)`
                  : "Nenhum arquivo selecionado"}
              </span>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <div className="import-cvs-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={processing || items.length === 0}
              onClick={() => void processAll()}
            >
              {processing
                ? `Analisando… (${doneCount}/${items.length})`
                : `Enviar e analisar (${items.length})`}
            </button>
          </div>
        )}

        {items.length > 0 && (
          <ul className="import-cvs-list">
            {items.map((it) => (
              <li key={it.id} className={`import-cvs-row import-cvs-row--${it.status}`}>
                <span className="import-cvs-row-name">{it.file.name}</span>
                <span className="import-cvs-row-meta">
                  {it.status === "pending" && "Aguardando"}
                  {it.status === "processing" &&
                    `Analisando… · ${formatElapsed(it.startedAt ? Date.now() - it.startedAt : 0)}`}
                  {it.status === "done" && (
                    <>
                      {it.nome ?? "Ok"}
                      {it.scoreIa != null ? ` · score ${it.scoreIa}` : ""}
                      {it.message ? ` · ${it.message}` : ""}
                      {it.elapsedMs != null ? ` · ${formatElapsed(it.elapsedMs)}` : ""}
                    </>
                  )}
                  {it.status === "error" && (
                    <>
                      {it.message ?? "Erro"}
                      {it.elapsedMs != null ? ` · ${formatElapsed(it.elapsedMs)}` : ""}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {feedback && step === "upload" && <p className="import-cvs-feedback">{feedback}</p>}
      </div>

      {step === "allocate" && successIds.length > 0 && (
        <section className="import-cvs-allocate crm-panel">
          <div className="dash-section">Alocar na vaga</div>
          <p className="import-cvs-allocate-hint">
            {successIds.length} candidato(s) prontos para inscrição na vaga.
          </p>
          <label className="crm-filters-field import-cvs-field">
            Vaga
            <select
              className="crm-toolbar-select"
              value={vagaId}
              onChange={(e) => setVagaId(e.target.value)}
              disabled={allocating}
            >
              <option value="">Selecione a vaga</option>
              {vagas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
          <div className="import-cvs-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={!vagaId || allocating}
              onClick={() => void allocate()}
            >
              {allocating ? "Alocando…" : "Alocar na vaga"}
            </button>
          </div>
          {feedback && <p className="import-cvs-feedback">{feedback}</p>}
        </section>
      )}
    </div>
  );
}
