import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Defina ${name} no ambiente do gege-crm.`);
  return value;
}

export async function getAuthUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          /* rotas API só leem sessão */
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
