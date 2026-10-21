"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { deleteForever, restoreDocument } from "@/app/actions/documents";

/** Restore, or delete for good with a second click instead of a browser dialog. */
export function TrashActions({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Não foi possível concluir.");
    });
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
      {error && <span className="error-text">{error}</span>}
      <button type="button" className="btn btn-glass btn-sm" disabled={pending} onClick={() => run(() => restoreDocument(id))}>
        <RotateCcw size={16} /> Restaurar
      </button>
      {confirming ? (
        <>
          <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => deleteForever(id))}>
            Excluir de vez
          </button>
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
        </>
      ) : (
        <button type="button" className="icon-btn" aria-label="Excluir de vez" title="Excluir de vez" onClick={() => setConfirming(true)}>
          <Trash2 size={17} />
        </button>
      )}
    </div>
  );
}
