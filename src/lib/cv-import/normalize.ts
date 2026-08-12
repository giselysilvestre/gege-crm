import { createHash } from "node:crypto";

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function localPdfId(buffer: Buffer): string {
  return `local:${sha256Hex(buffer)}`;
}

export function toNullableString(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

export function toNullableInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function normalizeEmail(raw: unknown): string | null {
  const s = toNullableString(raw)?.toLowerCase();
  if (!s || !s.includes("@")) return null;
  return s;
}

export function normalizeTelefone(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const d = digits.startsWith("55") ? digits : `55${digits}`;
  if (d.length === 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 13) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
  return null;
}

export function normalizeNome(raw: unknown): string | null {
  const s = toNullableString(raw);
  if (!s) return null;
  const lower = new Set(["da", "de", "do", "dos", "das", "e"]);
  return s
    .split(/\s+/)
    .map((w, i) => {
      const lw = w.toLowerCase();
      if (i > 0 && lower.has(lw)) return lw;
      return lw.charAt(0).toUpperCase() + lw.slice(1);
    })
    .join(" ");
}

export function normalizeIsoDateField(raw: unknown): string | null {
  const s = toNullableString(raw);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
