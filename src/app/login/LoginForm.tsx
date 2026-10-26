"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/format";

const ERRORS: Record<string, string> = {
  "sem-acesso": "Esse e-mail não tem acesso ao DEVDOC. Peça a um Admin ou Master para liberar.",
  link: "O link expirou ou já foi usado. Peça um novo abaixo.",
  google: "Não deu para entrar com o Google. Tente de novo ou use e-mail e senha.",
};

function translate(message: string) {
  if (/Invalid login credentials/i.test(message)) return "E-mail ou senha incorretos.";
  if (/Database error|DEVDOC_NOT_INVITED|Signups not allowed/i.test(message)) return ERRORS["sem-acesso"];
  if (/Email not confirmed/i.test(message)) return "Confirme seu e-mail pelo link que enviamos.";
  if (/email rate limit/i.test(message)) {
    return "O limite de e-mails por hora foi atingido. Tente de novo mais tarde, ou peça a um Admin para reenviar seu convite.";
  }
  if (/rate limit|too many/i.test(message)) return "Muitas tentativas. Espere um minuto e tente de novo.";
  if (/provider is not enabled/i.test(message)) return "O login com Google ainda não foi ativado. Use e-mail e senha.";
  return message;
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export function LoginForm({ erro, voltar }: { erro?: string; voltar?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(erro ? ERRORS[erro] ?? null : null);
  const [sent, setSent] = useState<string | null>(null);

  const next = safePath(voltar);
  const supabase = createClient();

  async function google() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(translate(error.message));
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const address = email.trim().toLowerCase();
    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      if (error) {
        setError(translate(error.message));
        setBusy(false);
        return;
      }
      router.replace(next);
      router.refresh();
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/auth/definir-senha`,
      },
    });
    setBusy(false);
    if (error) setError(translate(error.message));
    else setSent(address);
  }

  if (sent) {
    return (
      <section className="glass-strong panel" style={{ padding: 36 }}>
        <Mail size={28} aria-hidden="true" style={{ color: "var(--action)" }} />
        <h2 className="h2" style={{ marginTop: 16 }}>Confira seu e-mail</h2>
        <p className="lede" style={{ marginTop: 10 }}>
          Enviamos um link de acesso para <strong>{sent}</strong>. Ao abrir, você define sua senha e entra direto.
        </p>
        <button type="button" className="btn btn-quiet" style={{ marginTop: 20, marginLeft: -12 }} onClick={() => setSent(null)}>
          Usar outro e-mail
        </button>
      </section>
    );
  }

  return (
    <section className="glass-strong panel" style={{ padding: "clamp(24px, 4vw, 40px)" }} aria-labelledby="entrar">
      <h2 id="entrar" className="h2" style={{ fontSize: 26 }}>
        {mode === "password" ? "Entrar" : "Receber link de acesso"}
      </h2>
      <p className="muted" style={{ marginTop: 6 }}>
        {mode === "password"
          ? "Use sua conta Google da empresa ou e-mail e senha."
          : "Para o primeiro acesso ou se esqueceu a senha. Só funciona com e-mail liberado por um Admin."}
      </p>

      <button type="button" className="btn btn-glass" style={{ width: "100%", marginTop: 24 }} onClick={google} disabled={busy}>
        <GoogleMark /> Entrar com Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "22px 0" }} aria-hidden="true">
        <span style={{ flex: 1, height: 1, background: "var(--line-strong)" }} />
        <span className="muted small">ou</span>
        <span style={{ flex: 1, height: 1, background: "var(--line-strong)" }} />
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@empresa.com.br"
          />
        </div>
        {mode === "password" && (
          <div>
            <label className="label" htmlFor="senha">Senha</label>
            <input
              id="senha"
              className="field"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}
        {error && (
          <p className="notice notice-danger" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {mode === "password" ? "Entrar" : "Enviar link"} <ArrowRight size={18} />
        </button>
      </form>

      <button
        type="button"
        className="link"
        style={{ marginTop: 20, background: "none", cursor: "pointer" }}
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
        }}
      >
        {mode === "password" ? "Primeiro acesso ou esqueceu a senha?" : "Voltar para e-mail e senha"}
      </button>
      <p className="muted small" style={{ marginTop: 18 }}>
        Ao entrar, seus dados são tratados conforme o <a className="link" href="/privacidade">aviso de privacidade</a>.
      </p>
    </section>
  );
}
