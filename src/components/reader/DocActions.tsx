"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  BookmarkPlus,
  Download,
  FileArchive,
  FileDown,
  FileText,
  History,
  Loader2,
  PencilLine,
  Pin,
  PinOff,
  Star,
  Trash2,
} from "lucide-react";
import { recordView, saveCopy, toggleFavorite, togglePin, trashDocument } from "@/app/actions/documents";

interface Props {
  id: string;
  favorite: boolean;
  canEdit: boolean;
  canPin: boolean;
  pinned: boolean;
  isAuthor: boolean;
}

function SaveCopyButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-glass btn-sm" disabled={pending} title="Cria uma cópia privada que você pode editar">
      {pending ? <Loader2 size={16} className="spin" /> : <BookmarkPlus size={16} />}
      Salvar para mim
    </button>
  );
}

function TrashSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-danger btn-sm" disabled={pending}>
      {pending ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
      Mover para a lixeira
    </button>
  );
}

/** One row: quiet icon tools, a hairline, then the labelled actions with Editar last. */
export function DocActions({ id, favorite, canEdit, canPin, pinned, isAuthor }: Props) {
  const [fav, setFav] = useState(favorite);
  const [pin, setPin] = useState(pinned);
  const [open, setOpen] = useState<"export" | "trash" | null>(null);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recordView(id);
  }, [id]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="doc-actions no-print" role="toolbar" aria-label="Ações do documento">
      <button
        type="button"
        className="icon-btn doc-tool"
        aria-pressed={fav}
        data-active={fav}
        aria-label={fav ? "Tirar dos favoritos" : "Adicionar aos favoritos"}
        title={fav ? "Tirar dos favoritos" : "Favoritar"}
        onClick={() => {
          setFav(!fav);
          start(async () => {
            const r = await toggleFavorite(id, !fav);
            if (!r.ok) setFav(fav);
          });
        }}
      >
        <Star size={18} fill={fav ? "currentColor" : "none"} />
      </button>

      <span style={{ position: "relative" }}>
        <button
          type="button"
          className="icon-btn doc-tool"
          aria-label="Exportar"
          title="Exportar"
          aria-haspopup="menu"
          aria-expanded={open === "export"}
          onClick={() => setOpen(open === "export" ? null : "export")}
        >
          <Download size={18} />
        </button>
        {open === "export" && (
          <div className="glass-strong menu" role="menu" style={{ top: "calc(100% + 8px)", right: 0 }}>
            <a role="menuitem" className="menu-item" href={`/api/export/${id}?formato=md`}>
              <FileText size={17} /> Markdown (.md)
            </a>
            <a role="menuitem" className="menu-item" href={`/api/export/${id}?formato=zip`}>
              <FileArchive size={17} /> Pacote com imagens (.zip)
            </a>
            <a role="menuitem" className="menu-item" href={`/imprimir/${id}`} target="_blank" rel="noopener">
              <FileDown size={17} /> PDF
            </a>
          </div>
        )}
      </span>

      <Link href={`/d/${id}/historico`} className="icon-btn doc-tool" aria-label="Histórico de versões" title="Histórico de versões">
        <History size={18} />
      </Link>

      {canPin && (
        <button
          type="button"
          className="icon-btn doc-tool"
          aria-pressed={pin}
          data-active={pin}
          aria-label={pin ? "Desafixar do painel da operação" : "Fixar no painel da operação"}
          title={pin ? "Desafixar do painel da operação" : "Fixar no painel da operação"}
          onClick={() => {
            setPin(!pin);
            start(async () => {
              const r = await togglePin(id, !pin);
              if (!r.ok) setPin(pin);
            });
          }}
        >
          {pin ? <PinOff size={18} /> : <Pin size={18} />}
        </button>
      )}

      {canEdit && (
        <span style={{ position: "relative" }}>
          <button
            type="button"
            className="icon-btn doc-tool doc-tool-danger"
            aria-label="Excluir"
            title="Excluir"
            aria-expanded={open === "trash"}
            onClick={() => setOpen(open === "trash" ? null : "trash")}
          >
            <Trash2 size={18} />
          </button>
          {open === "trash" && (
            <div className="glass-strong menu" role="dialog" aria-label="Confirmar exclusão" style={{ top: "calc(100% + 8px)", right: 0, width: 300, padding: 16 }}>
              <p style={{ fontWeight: 600 }}>Mover para a lixeira?</p>
              <p className="muted small" style={{ marginTop: 4 }}>Fica 30 dias na lixeira e dá para restaurar.</p>
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <form action={trashDocument.bind(null, id)}>
                  <TrashSubmit />
                </form>
                <button type="button" className="btn btn-quiet btn-sm" onClick={() => setOpen(null)}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </span>
      )}

      <span className="doc-actions-sep" aria-hidden="true" />

      {!isAuthor && (
        <form action={saveCopy.bind(null, id)}>
          <SaveCopyButton />
        </form>
      )}
      {canEdit && (
        <Link href={`/d/${id}/editar`} className="btn btn-primary btn-sm">
          <PencilLine size={16} /> Editar
        </Link>
      )}
    </div>
  );
}
