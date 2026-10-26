"use client";

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Camera, Check, KeyRound, Loader2, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { initials } from "@/lib/format";
import { LEVEL_LABEL, type Level } from "@/lib/types";

interface Props {
  me: { id: string; full_name: string; email: string; level: Level; avatar_url: string | null };
  groups: { name: string; color: string; kind: string }[];
}

type Note = { text: string; error?: boolean } | null;

/** Square crop from the center, 384px, webp. Small enough for every avatar on the site. */
async function toAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 384;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 384, 384);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("blob"))), "image/webp", 0.86),
  );
}

export function ProfileForm({ me, groups }: Props) {
  const supabase = useMemo(createClient, []);
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState(me.avatar_url);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoNote, setPhotoNote] = useState<Note>(null);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passBusy, setPassBusy] = useState(false);
  const [passNote, setPassNote] = useState<Note>(null);

  async function clearOldPhotos(keep?: string) {
    const { data } = await supabase.storage.from("avatars").list(me.id);
    const old = (data ?? []).map((f) => `${me.id}/${f.name}`).filter((p) => p !== keep);
    if (old.length) await supabase.storage.from("avatars").remove(old);
  }

  async function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setPhotoNote({ text: "Escolha uma imagem PNG, JPG ou WEBP.", error: true });
    setPhotoBusy(true);
    setPhotoNote(null);
    try {
      const blob = await toAvatar(file);
      const path = `${me.id}/${Date.now()}.webp`;
      const up = await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/webp", upsert: false });
      if (up.error) throw up.error;
      const url = `/api/avatar/${path}`;
      const { error } = await supabase.from("members").update({ avatar_url: url }).eq("id", me.id);
      if (error) throw error;
      await clearOldPhotos(path);
      setAvatar(url);
      setPhotoNote({ text: "Foto atualizada." });
      router.refresh();
    } catch {
      setPhotoNote({ text: "Não foi possível trocar a foto. Tente outra imagem.", error: true });
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoNote(null);
    const { error } = await supabase.from("members").update({ avatar_url: null }).eq("id", me.id);
    if (!error) await clearOldPhotos();
    setPhotoBusy(false);
    if (error) return setPhotoNote({ text: "Não foi possível remover a foto.", error: true });
    setAvatar(null);
    setPhotoNote({ text: "Foto removida." });
    router.refresh();
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 10) return setPassNote({ text: "Use pelo menos 10 caracteres.", error: true });
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setPassNote({ text: "Misture letras minúsculas, maiúsculas e números.", error: true });
    }
    if (password !== confirm) return setPassNote({ text: "As duas senhas não são iguais.", error: true });
    setPassBusy(true);
    setPassNote(null);
    const { error } = await supabase.auth.updateUser({ password });
    setPassBusy(false);
    if (error) {
      const same = /different from the old|same.*password/i.test(error.message);
      return setPassNote({ text: same ? "A nova senha precisa ser diferente da atual." : "Não foi possível trocar a senha. Tente de novo.", error: true });
    }
    setPassword("");
    setConfirm("");
    setPassNote({ text: "Senha alterada. Use a nova senha no próximo acesso." });
  }

  const strong = password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password);

  return (
    <div className="profile-grid">
      <section className="glass panel profile-card">
        <div className="profile-photo">
          <span className="avatar avatar-xl" style={{ "--c": "var(--ink)", color: "var(--ground)" } as React.CSSProperties}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatar ? <img src={avatar} alt="Sua foto de perfil" /> : initials(me.full_name || me.email)}
          </span>
          {photoBusy && (
            <span className="profile-photo-busy" aria-hidden="true">
              <Loader2 size={22} className="spin" />
            </span>
          )}
        </div>
        <h2 className="h2" style={{ marginTop: 16, textAlign: "center" }}>{me.full_name || "Sem nome"}</h2>
        <p className="muted" style={{ textAlign: "center", overflowWrap: "anywhere" }}>{me.email}</p>

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickPhoto} />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 18 }}>
          <button type="button" className="btn btn-glass btn-sm" disabled={photoBusy} onClick={() => fileRef.current?.click()}>
            <Camera size={16} /> {avatar ? "Trocar foto" : "Enviar foto"}
          </button>
          {avatar && (
            <button type="button" className="btn btn-quiet btn-sm" disabled={photoBusy} onClick={removePhoto}>
              <Trash2 size={16} /> Remover
            </button>
          )}
        </div>
        {photoNote && (
          <p className={photoNote.error ? "notice notice-danger" : "notice"} role="status" style={{ marginTop: 14 }}>
            {photoNote.text}
          </p>
        )}

        <dl className="profile-facts">
          <div>
            <dt>Nível</dt>
            <dd>{LEVEL_LABEL[me.level]}</dd>
          </div>
          <div>
            <dt>Grupos</dt>
            <dd style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {groups.length ? (
                groups.map((g) => (
                  <span key={`${g.kind}-${g.name}`} className="pill" title={g.kind} style={{ "--c": g.color } as React.CSSProperties}>
                    {g.name}
                  </span>
                ))
              ) : (
                <span className="muted">Nenhum</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="stack" style={{ gap: 20 }}>
        <section className="glass panel">
          <h2 className="h2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <KeyRound size={20} aria-hidden="true" style={{ color: "var(--action)" }} /> Senha
          </h2>
          <p className="muted" style={{ marginTop: 6 }}>
            Pelo menos 10 caracteres, com letras minúsculas, maiúsculas e números. Se você entra com o Google, pode criar uma senha aqui também.
          </p>
          <form onSubmit={changePassword} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 18 }}>
            <div>
              <label className="label" htmlFor="pw-new">Nova senha</label>
              <input id="pw-new" className="field" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="pw-confirm">Repita a nova senha</label>
              <input id="pw-confirm" className="field" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <button type="submit" className="btn btn-primary btn-sm" disabled={passBusy || !password || !confirm}>
                {passBusy ? <Loader2 size={16} className="spin" /> : <Check size={16} />} Salvar nova senha
              </button>
              {password && (
                <span className="muted small" aria-live="polite">
                  {strong ? (password === confirm ? "Tudo certo." : "Agora repita a senha.") : "Ainda fraca."}
                </span>
              )}
            </div>
            {passNote && (
              <p className={passNote.error ? "notice notice-danger" : "notice"} role="status" style={{ gridColumn: "1 / -1" }}>
                {passNote.text}
              </p>
            )}
          </form>
        </section>

        <section className="glass panel">
          <h2 className="h2" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Lock size={20} aria-hidden="true" style={{ color: "var(--action)" }} /> Cadastro
          </h2>
          <ul className="profile-locks">
            <li>
              <span>E-mail</span>
              <span className="muted">Só um Master altera.</span>
            </li>
            <li>
              <span>Nome, nível e grupos</span>
              <span className="muted">Um Admin ou Master altera.</span>
            </li>
            <li>
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                <ShieldCheck size={16} aria-hidden="true" style={{ color: "var(--action)" }} /> Verificação em duas etapas
              </span>
              <span className="muted">Ativa. Trocou de celular? Peça a um Admin para redefinir.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
