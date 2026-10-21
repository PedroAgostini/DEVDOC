"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { FilePlus2, LayoutGrid, ListFilter, Search, Upload } from "lucide-react";
import { quickSearch, type QuickResult } from "@/app/actions/documents";
import type { Category, Operation } from "@/lib/types";
import { CategoryIcon } from "./icons";

interface Props {
  open: boolean;
  onClose: () => void;
  operations: Operation[];
  categories: Category[];
  onNewDocument: () => void;
}

export function CommandPalette({ open, onClose, operations, categories, onNewDocument }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<QuickResult[]>([]);
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    const t = setTimeout(() => {
      startTransition(async () => {
        const r = await quickSearch(term);
        if (id === seq.current) {
          setResults(r);
          // New results arrive after typing; the best match takes the highlight.
          setSelected(r[0]?.id ?? "all-results");
        }
      });
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  const term = q.trim().toLowerCase();
  const opMatches = useMemo(
    () => operations.filter((o) => !term || o.name.toLowerCase().includes(term)),
    [operations, term],
  );

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-strong dialog" role="dialog" aria-modal="true" aria-label="Buscar no DEVDOC">
        <Command
          shouldFilter={false}
          loop
          value={selected}
          onValueChange={setSelected}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Buscar documentos, prompts e códigos"
          />
          <Command.List>
            {term.length >= 2 && (
              <Command.Group heading={pending ? "Buscando" : "Documentos"}>
                {results.map((r) => {
                  const cat = categories.find((c) => c.id === r.category_id);
                  const op = operations.find((o) => o.id === r.operation_id);
                  return (
                    <Command.Item key={r.id} value={r.id} onSelect={() => go(`/d/${r.id}`)}>
                      <span className="pane" style={{ "--c": cat?.color ?? "#56667f", width: 28, height: 34 } as React.CSSProperties}>
                        <CategoryIcon slug={cat?.slug} size={14} />
                      </span>
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span className="doc-title" style={{ display: "block", fontSize: 15 }}>{r.title}</span>
                        <span className="muted small">
                          {[cat?.name, op?.name, r.status === "draft" ? "Rascunho" : null].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Command.Item>
                  );
                })}
                {!pending && results.length === 0 && (
                  <div className="muted" style={{ padding: "14px 12px" }}>
                    Nada encontrado para “{q.trim()}”.
                  </div>
                )}
                <Command.Item value="all-results" onSelect={() => go(`/documentos?q=${encodeURIComponent(q.trim())}`)}>
                  <ListFilter size={18} />
                  Ver todos os resultados com filtros
                </Command.Item>
              </Command.Group>
            )}
            <Command.Group heading="Ações">
              <Command.Item value="new" onSelect={() => { onClose(); onNewDocument(); }}>
                <FilePlus2 size={18} /> Novo documento
              </Command.Item>
              <Command.Item value="import" onSelect={() => go("/importar")}>
                <Upload size={18} /> Importar arquivos .md ou .zip
              </Command.Item>
              <Command.Item value="home" onSelect={() => go("/")}>
                <LayoutGrid size={18} /> Painel geral
              </Command.Item>
            </Command.Group>
            {opMatches.length > 0 && (
              <Command.Group heading="Operações">
                {opMatches.map((o) => (
                  <Command.Item key={o.id} value={`op-${o.id}`} onSelect={() => go(`/operacoes/${o.slug}`)}>
                    <span className="op-swatch" style={{ "--c": o.color } as React.CSSProperties} />
                    {o.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
        <div className="muted small" style={{ display: "flex", gap: 16, padding: "10px 20px", borderTop: "1px solid var(--line)" }}>
          <span><span className="kbd">↑↓</span> navegar</span>
          <span><span className="kbd">Enter</span> abrir</span>
          <span><span className="kbd">Esc</span> fechar</span>
          <Search size={14} style={{ marginLeft: "auto", alignSelf: "center" }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
