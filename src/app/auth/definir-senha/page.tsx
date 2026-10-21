"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("Use pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setBusy(true);
    setError(null);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setBusy(false);
      setError(/session/i.test(error.message) ? "O link expirou. Volte ao login e peça um novo." : error.message);
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={submit} className="glass-strong panel" style={{ width: "min(440px, 100%)", padding: 36, display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1 className="h2" style={{ fontSize: 26 }}>Crie sua senha</h1>
          <p className="muted" style={{ marginTop: 6 }}>
            Você também pode entrar com o Google, se seu e-mail for da conta Google da empresa.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="nova">Nova senha</label>
          <input id="nova" className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <p className="hint">Pelo menos 8 caracteres.</p>
        </div>
        <div>
          <label className="label" htmlFor="repetir">Repita a senha</label>
          <input id="repetir" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <p className="notice notice-danger" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Salvar e entrar
        </button>
      </form>
    </main>
  );
}
