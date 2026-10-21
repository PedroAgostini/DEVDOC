"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { FilePlus2, FileText, Loader2, X } from "lucide-react";
import { createDocument } from "@/app/actions/documents";
import type { Category } from "@/lib/types";
import { CategoryIcon } from "./icons";

const HINTS: Record<string, string> = {
  documentacao: "Objetivo, contexto e passo a passo",
  prompt: "Prompt com variáveis para preencher",
  codigo: "Trecho de código, como usar e cuidados",
  "resolucao-de-problemas": "Sintoma, causa e correção",
  processo: "Etapas, responsáveis e prazos",
  onboarding: "Checklist da primeira semana",
};

function Choice({ category }: { category: Category }) {
  const { pending, data } = useFormStatus();
  const mine = pending && data?.get("categoria") === category.slug;
  return (
    <button
      type="submit"
      name="categoria"
      value={category.slug}
      className="choice"
      disabled={pending}
      style={{ alignItems: "center" }}
    >
      <span className="pane" style={{ "--c": category.color, width: 34, height: 40 } as React.CSSProperties} aria-hidden="true">
        {mine ? <Loader2 size={16} className="spin" /> : <CategoryIcon slug={category.slug} size={16} />}
      </span>
      <span style={{ lineHeight: 1.35, minWidth: 0 }}>
        <span style={{ display: "block", fontWeight: 600 }}>{category.name}</span>
        <span className="muted small">
          {HINTS[category.slug] ?? (category.template_md.trim() ? "Com modelo" : "Em branco")}
        </span>
      </span>
    </button>
  );
}

function Blank() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name="modelo" value="nao" className="btn btn-quiet btn-sm" disabled={pending}>
      <FileText size={16} /> Começar em branco, sem categoria
    </button>
  );
}

/** "What are you writing?" Each category starts from its template. */
export function NewDocChooser({
  open,
  onClose,
  categories,
  operation,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  operation?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-strong dialog panel" role="dialog" aria-modal="true" aria-labelledby="new-doc-title" style={{ padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <h2 id="new-doc-title" className="h2" style={{ fontSize: 24 }}>O que você vai escrever?</h2>
            <p className="muted" style={{ marginTop: 6 }}>
              Cada tipo já vem com um modelo para preencher. Dá para mudar tudo depois.
            </p>
          </div>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <form action={createDocument} style={{ marginTop: 22 }}>
          {operation && <input type="hidden" name="operacao" value={operation} />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 10 }}>
            {categories.map((c) => (
              <Choice key={c.id} category={c} />
            ))}
          </div>
          <div style={{ marginTop: 16, marginLeft: -12 }}>
            <Blank />
          </div>
        </form>
      </div>
    </div>
  );
}

/** Button plus chooser, for pages outside the shell's top bar. */
export function NewDocButton({
  categories,
  operation,
  label = "Novo documento",
  className = "btn btn-glass",
}: {
  categories: Category[];
  operation?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <FilePlus2 size={18} /> {label}
      </button>
      <NewDocChooser open={open} onClose={() => setOpen(false)} categories={categories} operation={operation} />
    </>
  );
}
