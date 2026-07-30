import type { User } from "@supabase/supabase-js";

/** Primeiro nome para exibir/gravar em contato_humano_por. */
export function primeiroNomeFromAuthUser(user: User): string {
  const meta = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof meta === "string" && meta.trim()) {
    return meta.trim().split(/\s+/)[0] ?? "Recrutador";
  }
  const local = (user.email ?? "").split("@")[0] ?? "";
  const token = local.split(/[._-]+/).filter(Boolean)[0] ?? local;
  if (!token) return "Recrutador";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}
