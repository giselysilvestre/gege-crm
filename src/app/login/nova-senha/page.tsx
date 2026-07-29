"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import "../login.css";

export default function NovaSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (senha.length < 6) {
      setError("Use pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password: senha });
      if (updateError) throw updateError;
      router.replace("/whatsapp");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="crm-login-shell">
      <div className="crm-login-card">
        <h1 className="crm-login-title">Nova senha</h1>
        <p className="crm-login-lead">Defina uma nova senha para sua conta Gegê CRM</p>
        <form onSubmit={onSubmit}>
          <div className="crm-login-field">
            <label htmlFor="nova-senha">Nova senha</label>
            <input
              id="nova-senha"
              type="password"
              autoComplete="new-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <div className="crm-login-field">
            <label htmlFor="confirmar-senha">Confirmar senha</label>
            <input
              id="confirmar-senha"
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="crm-login-submit" disabled={loading}>
            {loading ? "Salvando…" : "Salvar e entrar"}
          </button>
          {error ? <p className="crm-login-error">{error}</p> : null}
        </form>
      </div>
    </main>
  );
}
