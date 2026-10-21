"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { deleteGroup, saveGroup } from "@/app/actions/admin";
import { MultiPicker } from "@/components/ui/MultiPicker";
import { LEVEL_LABEL, type Group, type Member } from "@/lib/types";

interface Props {
  groups: Group[];
  groupMembers: { group_id: string; member_id: string }[];
  autoCounts: Record<string, number>;
  members: Member[];
}

export function GroupsAdmin({ groups, groupMembers, autoCounts, members }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const auto = groups.filter((g) => g.operation_id || g.department_id);
  const custom = groups.filter((g) => !g.operation_id && !g.department_id);
  const options = members.filter((m) => m.active).map((m) => ({ value: m.id, label: m.full_name || m.email, hint: LEVEL_LABEL[m.level] }));

  function open(g?: Group) {
    setEditing(g?.id ?? "new");
    setName(g?.name ?? "");
    setPicked(g ? groupMembers.filter((x) => x.group_id === g.id).map((x) => x.member_id) : []);
    setError(null);
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
      else after?.();
    });
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveGroup({ id: editing === "new" ? undefined : editing!, name, members: picked }), () => setEditing(null));
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", borderRadius: 18, background: "var(--action-soft)", margin: "6px 0" }}
    >
      <div>
        <label className="label" htmlFor="group-name">Nome do grupo</label>
        <input id="group-name" className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex.: Squad Checkout" />
      </div>
      <MultiPicker label="Pessoas" options={options} value={picked} onChange={setPicked} placeholder="Buscar pelo nome" />
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}><Check size={16} /> Salvar</button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
      </div>
    </form>
  );

  return (
    <section className="glass panel">
      <div className="panel-head" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 className="h2">Grupos</h2>
          <p className="muted small" style={{ marginTop: 4, maxWidth: "60ch" }}>
            Cada operação e cada departamento já é um grupo, com as pessoas dele. Crie grupos extras para times que cruzam os dois.
          </p>
        </div>
        {editing !== "new" && (
          <button type="button" className="btn btn-glass btn-sm" onClick={() => open()}>
            <Plus size={16} /> Novo grupo
          </button>
        )}
      </div>
      {error && <p className="notice notice-danger" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {editing === "new" && form}

      <ul>
        {custom.map((g) =>
          editing === g.id ? (
            <li key={g.id}>{form}</li>
          ) : (
            <li key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ flex: 1 }}>
                <span style={{ fontWeight: 600 }}>{g.name}</span>
                <span className="muted small" style={{ display: "block" }}>
                  {groupMembers.filter((x) => x.group_id === g.id).length} pessoas
                </span>
              </span>
              {confirm === g.id ? (
                <>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => run(() => deleteGroup(g.id), () => setConfirm(null))}>Excluir grupo</button>
                  <button type="button" className="icon-btn" aria-label="Cancelar" onClick={() => setConfirm(null)}><X size={17} /></button>
                </>
              ) : (
                <>
                  <button type="button" className="icon-btn" aria-label={`Editar ${g.name}`} onClick={() => open(g)}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Excluir ${g.name}`} onClick={() => setConfirm(g.id)}><Trash2 size={16} /></button>
                </>
              )}
            </li>
          ),
        )}
        {auto.map((g) => (
          <li key={g.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ flex: 1 }}>
              <span style={{ fontWeight: 600 }}>{g.name}</span>
              <span className="muted small" style={{ display: "block" }}>
                {g.operation_id ? "Automático da operação" : "Automático do departamento"} · {autoCounts[g.id] ?? 0} pessoas
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
