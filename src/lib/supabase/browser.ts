import { createBrowserClient } from "@supabase/ssr";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Defina ${name} no .env.local do gege-crm.`);
  return value;
}

export function getSupabaseBrowserClient() {
  const url = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return createBrowserClient(url, anonKey);
}
