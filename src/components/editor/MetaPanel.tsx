"use client";

import { Globe2, Layers, Lock, Users, UsersRound, type LucideIcon } from "lucide-react";
import { MultiPicker } from "@/components/ui/MultiPicker";
import { LEVEL_LABEL, LEVELS, REVIEW_OPTIONS, type Level, type Member, type Reference, type Visibility } from "@/lib/types";

export interface MetaState {
  category_id: string | null;
  operation_id: string | null;
  department_id: string | null;
  owner_id: string | null;
  review_interval_months: number | null;
  clients: string[];
  tags: string[];
  visibility: Visibility;
  min_level: Level;
  groups: string[];
  people: string[];
  editors: string[];
}

interface Props {
  meta: MetaState;
  onChange: (patch: Partial<MetaState>) => void;
  reference: Reference;
  members: Member[];
  authorId: string;
  canChangeAccess: boolean;
  knownTags: string[];
}

const VIS: { value: Visibility; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "all", label: "Todos", hint: "Qualquer pessoa com acesso ao DEVDOC.", icon: Globe2 },
  { value: "level", label: "A partir de um nível", hint: "Quem tem o nível escolhido ou acima.", icon: Layers },
  { value: "groups", label: "Grupos", hint: "Operações, departamentos ou grupos que você escolher.", icon: UsersRound },
  { value: "people", label: "Pessoas específicas", hint: "Só as pessoas que você escolher.", icon: Users },
  { value: "private", label: "Só eu", hint: "Nem Admin nem Master conseguem ler.", icon: Lock },
];

export function MetaPanel({ meta, onChange, reference, members, authorId, canChangeAccess, knownTags }: Props) {
  const people = members
    .filter((m) => m.active && m.id !== authorId)
    .map((m) => ({ value: m.id, label: m.full_name || m.email, hint: `${LEVEL_LABEL[m.level]} · ${m.email}` }));

  return (
    <div className="stack" style={{ gap: 20 }}>
      <section className="glass panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Organização</h2>
        <div>
          <label className="label" htmlFor="meta-cat">Categoria</label>
          <select
            id="meta-cat"
            className="select"
            value={meta.category_id ?? ""}
            onChange={(e) => onChange({ category_id: e.target.value || null })}
          >
            <option value="">Sem categoria</option>
            {reference.categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="meta-op">Operação</label>
          <select
            id="meta-op"
            className="select"
            value={meta.operation_id ?? ""}
            onChange={(e) => onChange({ operation_id: e.target.value || null })}
          >
            <option value="">Nenhuma, conteúdo geral</option>
            {reference.operations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="meta-dep">Departamento</label>
          <select
            id="meta-dep"
            className="select"
            value={meta.department_id ?? ""}
            onChange={(e) => onChange({ department_id: e.target.value || null })}
          >
            <option value="">Nenhum</option>
            {reference.departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <MultiPicker
          label="Clientes"
          options={[...reference.clients]
            .sort((a, b) => Number(b.operation_id === meta.operation_id) - Number(a.operation_id === meta.operation_id))
            .map((c) => ({
              value: c.id,
              label: c.name,
              hint: reference.operations.find((o) => o.id === c.operation_id)?.name,
            }))}
          value={meta.clients}
          onChange={(clients) => onChange({ clients })}
          placeholder={reference.clients.length ? "Buscar cliente" : "Nenhum cliente cadastrado"}
          disabled={!reference.clients.length}
        />
        <MultiPicker
          label="Tags"
          options={knownTags.map((t) => ({ value: t, label: `#${t}` }))}
          value={meta.tags}
          onChange={(tags) => onChange({ tags })}
          placeholder="Digite e aperte Enter"
          creatable
        />
      </section>

      <section className="glass panel" style={{ display: "flex", flexDirection: "column", gap: 12 }} aria-labelledby="access-title">
        <h2 id="access-title" className="h2" style={{ fontSize: 18 }}>Quem pode ver</h2>
        {!canChangeAccess && <p className="hint" style={{ marginTop: -4 }}>Só o autor ou um Admin muda o acesso.</p>}
        <div role="radiogroup" aria-labelledby="access-title" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {VIS.map((v) => {
            const Icon = v.icon;
            const checked = meta.visibility === v.value;
            return (
              <button
                key={v.value}
                type="button"
                role="radio"
                aria-checked={checked}
                className="choice"
                disabled={!canChangeAccess}
                onClick={() => onChange({ visibility: v.value })}
              >
                <Icon size={18} style={{ marginTop: 2, flex: "none", color: checked ? "var(--action)" : "var(--ink-3)" }} />
                <span style={{ lineHeight: 1.35 }}>
                  <span style={{ display: "block", fontWeight: 600 }}>{v.label}</span>
                  <span className="muted small">{v.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
        {meta.visibility === "level" && (
          <div>
            <label className="label" htmlFor="meta-level">Nível mínimo</label>
            <select
              id="meta-level"
              className="select"
              disabled={!canChangeAccess}
              value={meta.min_level}
              onChange={(e) => onChange({ min_level: e.target.value as Level })}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>{LEVEL_LABEL[l]} e acima</option>
              ))}
            </select>
          </div>
        )}
        {meta.visibility === "groups" && (
          <MultiPicker
            label="Grupos com acesso"
            options={reference.groups.map((g) => ({
              value: g.id,
              label: g.name,
              hint: g.operation_id ? "Operação" : g.department_id ? "Departamento" : "Grupo",
            }))}
            value={meta.groups}
            onChange={(groups) => onChange({ groups })}
            placeholder="Buscar operação ou grupo"
            disabled={!canChangeAccess}
          />
        )}
        {meta.visibility === "people" && (
          <MultiPicker
            label="Pessoas com acesso"
            options={people}
            value={meta.people}
            onChange={(p) => onChange({ people: p })}
            placeholder="Buscar pelo nome ou e-mail"
            disabled={!canChangeAccess}
          />
        )}
        {(meta.visibility === "groups" && meta.groups.length === 0) || (meta.visibility === "people" && meta.people.length === 0) ? (
          <p className="notice" style={{ fontSize: 13 }}>Enquanto ninguém for escolhido, só você vê.</p>
        ) : null}
      </section>

      <section className="glass panel" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h2 className="h2" style={{ fontSize: 18 }}>Revisão</h2>
        <div>
          <label className="label" htmlFor="meta-owner">Responsável</label>
          <select
            id="meta-owner"
            className="select"
            value={meta.owner_id ?? authorId}
            onChange={(e) => onChange({ owner_id: e.target.value })}
          >
            {members
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="meta-review">Revisar</label>
          <select
            id="meta-review"
            className="select"
            value={meta.review_interval_months ?? ""}
            onChange={(e) => onChange({ review_interval_months: e.target.value ? Number(e.target.value) : null })}
          >
            {REVIEW_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ?? ""}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="hint">Quando passar do prazo, o documento aparece para o responsável em “Para revisar”, no painel.</p>
        </div>
      </section>

      {meta.visibility !== "private" && (
        <section className="glass panel">
          <MultiPicker
            label="Coeditores"
            options={people}
            value={meta.editors}
            onChange={(editors) => onChange({ editors })}
            placeholder="Quem também pode editar"
            disabled={!canChangeAccess}
          />
          <p className="hint">Coeditores editam e publicam. O Gestor da operação e os Admins já podem.</p>
        </section>
      )}
    </div>
  );
}
