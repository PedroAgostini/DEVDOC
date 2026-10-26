"use client";

import { DevCredit } from "@/components/DevCredit";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/format";

type Mode = "loading" | "enroll" | "verify" | "error";

function Mfa() {
  const supabase = useMemo(createClient, []);
  const router = useRouter();
  const params = useSearchParams();
  const next = safePath(params.get("voltar"));
  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState("");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace(next);
        return;
      }
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError || !data) {
        router.replace("/login");
        return;
      }
      const verified = data.totp.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMode("verify");
        return;
      }
      // An enrollment left halfway would block a new one with the same name.
      for (const f of data.all.filter((f) => f.status === "unverified")) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "DEVDOC",
      });
      if (enrollError || !enrolled) {
        setError("Não foi possível iniciar a verificação em duas etapas. Recarregue a página.");
        setMode("error");
        return;
      }
      setFactorId(enrolled.id);
      setQr(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setMode("enroll");
    })();
  }, [supabase, router, next]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: code.replace(/\s/g, ""),
    });
    if (verifyError) {
      setBusy(false);
      setCode("");
      setError("Código inválido ou expirado. Confira se o horário do celular está certo e use o código atual.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const form = (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label className="label" htmlFor="mfa-code">Código de 6 dígitos</label>
        <input
          id="mfa-code"
          className="field"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000000"
          style={{ fontFamily: "var(--font-code)", fontSize: 20, letterSpacing: "0.3em", textAlign: "center" }}
        />
      </div>
      {error && <p className="notice notice-danger" role="alert">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={busy || code.replace(/\s/g, "").length < 6}>
        {busy && <Loader2 size={17} className="spin" />}
        {mode === "enroll" ? "Ativar e entrar" : "Entrar"}
      </button>
    </form>
  );

  return (
    <main className="solo-page">
      <section
        className="glass-strong panel mfa-card"
        style={{ width: mode === "enroll" ? "min(820px, 100%)" : "min(440px, 100%)", padding: "clamp(20px, 3.5vw, 36px)" }}
      >
        <header style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <ShieldCheck size={26} aria-hidden="true" style={{ color: "var(--action)", flex: "none" }} />
          <h1 className="h2" style={{ fontSize: 24 }}>
            {mode === "enroll" ? "Ative a verificação em duas etapas" : "Verificação em duas etapas"}
          </h1>
        </header>

        {mode === "loading" && (
          <p className="muted" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <Loader2 size={16} className="spin" /> Preparando
          </p>
        )}

        {mode === "enroll" && (
          <>
            <p className="muted" style={{ marginTop: 6 }}>
              Todo acesso ao DEVDOC pede, além da senha, um código do seu celular. Você configura uma vez.
            </p>
            <div className="mfa-grid">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code para o app autenticador" width={176} height={176} style={{ background: "#fff", borderRadius: 14, padding: 8 }} />
                <p className="muted small" style={{ textAlign: "center", maxWidth: 220 }}>
                  Sem câmera? Digite a chave:
                  <br />
                  <code style={{ fontFamily: "var(--font-code)", fontSize: 12, color: "var(--ink)", wordSpacing: "0.1em" }}>{secret.match(/.{1,4}/g)?.join(" ")}</code>
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, listStyle: "decimal" }}>
                  <li>Instale um app autenticador: Google Authenticator, Microsoft Authenticator ou 1Password.</li>
                  <li>No app, adicione uma conta e leia o QR code.</li>
                  <li>Digite abaixo o código que o app mostrar.</li>
                </ol>
                {form}
              </div>
            </div>
          </>
        )}

        {mode === "verify" && (
          <>
            <p className="muted" style={{ marginTop: 6, marginBottom: 18 }}>Digite o código do seu app autenticador.</p>
            {form}
          </>
        )}

        {mode === "error" && error && <p className="notice notice-danger" role="alert" style={{ marginTop: 16 }}>{error}</p>}

        <footer style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <p className="muted small">Perdeu o celular? Fale com um Admin.</p>
          <button type="button" className="btn btn-quiet btn-sm" style={{ marginRight: -10 }} onClick={signOut}>
            <LogOut size={16} /> Sair
          </button>
        </footer>
      </section>
      <DevCredit compact />
    </main>
  );
}

export default function MfaPage() {
  return (
    <Suspense>
      <Mfa />
    </Suspense>
  );
}
