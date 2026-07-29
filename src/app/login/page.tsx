"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import "./login.css";

function authRedirectUrl(extra?: Record<string, string>) {
  const params = new URLSearchParams(extra);
  const q = params.toString();
  return `${window.location.origin}/auth/callback${q ? `?${q}` : ""}`;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/whatsapp";
  const authError = searchParams.get("error") === "auth";

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState(authError ? "Não foi possível concluir o login. Tente de novo." : "");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    let redirecting = false;
    try {
      const supabase = getSupabaseBrowserClient();
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) throw new Error("Informe seu email.");

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: senha,
      });
      if (signInError) throw signInError;
      if (!data.session) throw new Error("Sessão não foi criada.");

      redirecting = true;
      window.location.assign(nextPath.startsWith("/") ? nextPath : "/whatsapp");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar.");
    } finally {
      if (!redirecting) setLoading(false);
    }
  }

  async function onForgotPassword() {
    setError("");
    setInfo("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Informe seu email acima para receber o link de redefinição.");
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: authRedirectUrl({ flow: "recovery", next: "/whatsapp" }),
      });
      if (resetError) throw resetError;
      setInfo("Enviamos um link para redefinir sua senha. Confira seu email (e o spam).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o email.");
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setError("");
    setInfo("");
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Informe seu email acima para receber o link mágico.");
      return;
    }
    setMagicLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: authRedirectUrl({ next: nextPath.startsWith("/") ? nextPath : "/whatsapp" }),
          shouldCreateUser: false,
        },
      });
      if (otpError) throw otpError;
      setInfo(
        "Link mágico enviado! Abra o email neste dispositivo e clique no link para entrar sem senha."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o link mágico.");
    } finally {
      setMagicLoading(false);
    }
  }

  return (
    <main className="crm-login-shell">
      <div className="crm-login-card">
        <h1 className="crm-login-title">Gegê CRM</h1>
        <p className="crm-login-lead">Acesse o painel de conversas WhatsApp</p>

        <form onSubmit={onSubmit} autoComplete="on" method="post">
          <div className="crm-login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              name="username"
              type="email"
              autoComplete="username"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="crm-login-field crm-login-field-password">
            <div className="crm-login-label-row">
              <label htmlFor="login-senha">Senha</label>
              <button
                type="button"
                className="crm-login-link-btn"
                onClick={onForgotPassword}
                disabled={loading || magicLoading}
              >
                Esqueceu a senha?
              </button>
            </div>
            <input
              id="login-senha"
              name="password"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="crm-login-submit" disabled={loading || magicLoading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="crm-login-divider">
          <span>OU</span>
        </div>

        <button
          type="button"
          className="crm-login-magic"
          onClick={onMagicLink}
          disabled={loading || magicLoading}
        >
          <span className="crm-login-magic-icon" aria-hidden="true">
            ✉
          </span>
          {magicLoading ? "Enviando link…" : "Entrar com link mágico"}
        </button>

        <p className="crm-login-hint">
          Link mágico = email com botão para entrar <strong>sem digitar senha</strong> (vale por pouco
          tempo).
        </p>

        {info ? <p className="crm-login-info">{info}</p> : null}
        {error ? <p className="crm-login-error">{error}</p> : null}

        <p className="crm-login-footer">Use a mesma conta do gege.ia.br</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="crm-login-shell" />}>
      <LoginForm />
    </Suspense>
  );
}
