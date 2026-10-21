"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Trash2, Undo2 } from "lucide-react";
import { deleteDraft, discardDraft } from "@/app/actions/documents";

/**
 * Trash for a draft. A never-published draft is deleted for good;
 * a published document only loses its unpublished changes.
 */
export function DraftActions({
  id,
  published,
  afterDone = "refresh",
  variant = "icon",
}: {
  id: string;
  published: boolean;
  afterDone?: "refresh" | "drafts" | "document";
  variant?: "icon" | "button";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const label = published ? "Descartar alterações" : "Excluir rascunho";

  function confirm() {
    setError(null);
    start(async () => {
      const r = published ? await discardDraft(id) : await deleteDraft(id);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setOpen(false);
      if (afterDone === "drafts") router.push("/rascunhos");
      else if (afterDone === "document") router.push(`/d/${id}`);
      router.refresh();
    });
  }

  return (
    <span ref={ref} style={{ position: "relative", flex: "none" }}>
      {variant === "icon" ? (
        <button
          type="button"
          className="icon-btn doc-tool doc-tool-danger"
          aria-label={label}
          title={label}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {published ? <Undo2 size={18} /> : <Trash2 size={18} />}
        </button>
      ) : (
        <button type="button" className="btn btn-quiet btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {published ? <Undo2 size={16} /> : <Trash2 size={16} />} {label}
        </button>
      )}
      {open && (
        <div className="glass-strong menu" role="dialog" aria-label={label} style={{ top: "calc(100% + 8px)", right: 0, width: 300, padding: 16 }}>
          <p style={{ fontWeight: 600 }}>{published ? "Descartar as alterações?" : "Excluir este rascunho?"}</p>
          <p className="muted small" style={{ marginTop: 4 }}>
            {published
              ? "O documento volta para a última versão publicada. O que não foi publicado se perde."
              : "Ele nunca foi publicado e some de vez, junto com as imagens."}
          </p>
          {error && <p className="error-text" style={{ marginTop: 8 }}>{error}</p>}
          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={confirm}>
              {pending ? <Loader2 size={16} className="spin" /> : published ? <Undo2 size={16} /> : <Trash2 size={16} />}
              {published ? "Descartar" : "Excluir"}
            </button>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
