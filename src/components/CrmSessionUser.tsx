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

function displayNameFromEmail(email: string): string {
  return email.split("@")[0] ?? email;
}

function IconLogOut() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
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
      await fetch("/auth/signout", { method: "POST" });
      window.location.assign("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const displayName = email ? displayNameFromEmail(email) : "…";
  const initials = email ? initialsFromEmail(email) : "…";

  return (
    <div className="crm-sidebar-user" aria-label="Usuário logado">
      <span className="crm-sidebar-user-avatar" aria-hidden="true">
        {initials}
      </span>
      <span className="crm-sidebar-user-name">{displayName}</span>
      <button
        type="button"
        className="crm-sidebar-logout-btn"
        onClick={() => void onLogout()}
        disabled={loggingOut}
        aria-label="Sair"
        title="Sair"
      >
        <IconLogOut />
      </button>
    </div>
  );
}
