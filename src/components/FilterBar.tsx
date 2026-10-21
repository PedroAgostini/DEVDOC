"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import type { Category, Client, Department, Member, Operation } from "@/lib/types";

interface Props {
  categories: Category[];
  operations: Operation[];
  departments: Department[];
  clients: Client[];
  members: Member[];
}

export function FilterBar({ categories, operations, departments, clients, members }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [tag, setTag] = useState(params.get("tag") ?? "");
  const [pending, start] = useTransition();

  // Clients follow the chosen operation; "geral" and no operation show all.
  const chosenOp = operations.find((o) => o.slug === params.get("operacao"));
  const visibleClients = chosenOp ? clients.filter((c) => c.operation_id === chosenOp.id) : clients;

  function set(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("pagina");
    if (key === "operacao") {
      const op = operations.find((o) => o.slug === value);
      const client = clients.find((c) => c.id === next.get("cliente"));
      if (op && client && client.operation_id !== op.id) next.delete("cliente");
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if (q === (params.get("q") ?? "")) return;
    const t = setTimeout(() => set("q", q.trim()), 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = [...params.keys()].filter((k) => k !== "pagina").length;

  const select = (key: string, label: string, options: { value: string; label: string }[]) => (
    <div>
      <label className="sr-only" htmlFor={`f-${key}`}>{label}</label>
      <select id={`f-${key}`} className="select" value={params.get(key) ?? ""} onChange={(e) => set(key, e.target.value)}>
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  return (
    <section className="glass panel" aria-label="Filtros" style={{ display: "flex", flexDirection: "column", gap: 14, opacity: pending ? 0.85 : 1 }}>
      <div style={{ position: "relative" }}>
        <Search size={18} aria-hidden="true" style={{ position: "absolute", left: 14, top: 13, color: "var(--ink-3)" }} />
        <label className="sr-only" htmlFor="f-q">Buscar</label>
        <input
          id="f-q"
          className="field"
          style={{ paddingLeft: 42, fontSize: 16 }}
          placeholder="Buscar no título, no texto e nas tags"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10 }}>
        {select("categoria", "Categoria", categories.map((c) => ({ value: c.slug, label: c.name })))}
        {select("operacao", "Operação", [
          ...operations.map((o) => ({ value: o.slug, label: o.name })),
          { value: "geral", label: "Conteúdo geral" },
        ])}
        {select("departamento", "Departamento", departments.map((d) => ({ value: d.slug, label: d.name })))}
        {select("cliente", "Cliente", visibleClients.map((c) => ({ value: c.id, label: c.name })))}
        {select("autor", "Autor", members.map((m) => ({ value: m.id, label: m.full_name || m.email })))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            set("tag", tag.trim().replace(/^#/, "").toLowerCase());
          }}
        >
          <label className="sr-only" htmlFor="f-tag">Tag</label>
          <input id="f-tag" className="field" placeholder="Tag e Enter" value={tag} onChange={(e) => setTag(e.target.value)} onBlur={() => set("tag", tag.trim().replace(/^#/, "").toLowerCase())} />
        </form>
        <div className="filter-dates">
          <label className="muted small" htmlFor="f-de" style={{ flex: "none" }}>De</label>
          <input id="f-de" type="date" className="field" style={{ minWidth: 0 }} value={params.get("de") ?? ""} onChange={(e) => set("de", e.target.value)} />
          <label className="muted small" htmlFor="f-ate" style={{ flex: "none" }}>Até</label>
          <input id="f-ate" type="date" className="field" style={{ minWidth: 0 }} value={params.get("ate") ?? ""} onChange={(e) => set("ate", e.target.value)} />
        </div>
        {select("ordem", "Mais recentes primeiro", [
          { value: "antigos", label: "Mais antigos" },
          { value: "titulo", label: "Título de A a Z" },
        ])}
      </div>
      {active > 0 && (
        <button
          type="button"
          className="btn btn-quiet btn-sm"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            setQ("");
            setTag("");
            start(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X size={16} /> Limpar filtros
        </button>
      )}
    </section>
  );
}
