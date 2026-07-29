"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export function CrmSessionUser() {
  const [email, setEmail] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function onLogout() {
    setLoggingOut(true);
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.assign("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const label = email ?? "…";
  const initials = email ? initialsFromEmail(email) : "…";

  return (
    <>
      <div className="crm-topbar-user" aria-label="Usuário logado">
        <span className="crm-topbar-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="crm-topbar-name">{label}</span>
      </div>
      <button
        type="button"
        className="crm-topbar-icon-btn crm-topbar-logout"
        onClick={() => void onLogout()}
        disabled={loggingOut}
        aria-label="Sair"
        title="Sair"
      >
        {loggingOut ? "…" : "Sair"}
      </button>
    </>
  );
}
