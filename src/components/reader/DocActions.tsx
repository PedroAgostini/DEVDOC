"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileArchive, FileDown, FileText, History, PencilLine, Pin, PinOff, Star, Trash2 } from "lucide-react";
import { recordView, toggleFavorite, togglePin, trashDocument } from "@/app/actions/documents";

interface Props {
  id: string;
  favorite: boolean;
  canEdit: boolean;
  canPin: boolean;
  pinned: boolean;
}

export function DocActions({ id, favorite, canEdit, canPin, pinned }: Props) {
  const [fav, setFav] = useState(favorite);
  const [pin, setPin] = useState(pinned);
  const [menu, setMenu] = useState(false);
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [, start] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    recordView(id);
  }, [id]);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  return (
    <div className="no-print" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button
        type="button"
        className="icon-btn"
        aria-pressed={fav}
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

      {canEdit && (
        <Link href={`/d/${id}/editar`} className="btn btn-primary btn-sm">
          <PencilLine size={16} /> Editar
        </Link>
      )}

      <div ref={menuRef} style={{ position: "relative" }}>
        <button type="button" className="btn btn-glass btn-sm" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu(!menu)}>
          <Download size={16} /> Exportar
        </button>
        {menu && (
          <div className="glass-strong menu" role="menu" style={{ top: "calc(100% + 6px)", right: 0 }}>
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
      </div>

      <Link href={`/d/${id}/historico`} className="btn btn-quiet btn-sm">
        <History size={16} /> Histórico
      </Link>

      {canPin && (
        <button
          type="button"
          className="icon-btn"
          aria-pressed={pin}
          aria-label={pin ? "Desafixar do painel da operação" : "Fixar no painel da operação"}
          title={pin ? "Desafixar" : "Fixar no painel da operação"}
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

      {canEdit &&
        (confirmTrash ? (
          <span style={{ display: "inline-flex", gap: 6 }}>
            <form action={trashDocument.bind(null, id)}>
              <button type="submit" className="btn btn-danger btn-sm">
                Mover para a lixeira
              </button>
            </form>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => setConfirmTrash(false)}>
              Cancelar
            </button>
          </span>
        ) : (
          <button type="button" className="icon-btn" aria-label="Excluir" title="Excluir" onClick={() => setConfirmTrash(true)}>
            <Trash2 size={18} />
          </button>
        ))}
    </div>
  );
}
