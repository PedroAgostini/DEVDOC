"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ActionResult } from "@/app/actions/util";

export interface ListRow {
  id: string;
  name: string;
  color?: string;
  note?: string;
  selectValue?: string | null;
  textValue?: string;
}

interface Props {
  title: string;
  description: string;
  rows: ListRow[];
  withColor?: boolean;
  /** Optional single choice per row, e.g. the operation that serves a client. */
  select?: { label: string; emptyLabel: string; options: { value: string; label: string }[] };
  /** Optional long text per row, e.g. a category's template. */
  text?: { label: string; hint: string };
  addLabel: string;
  onSave: (input: { id?: string; name: string; color: string; select?: string | null; text?: string }) => Promise<ActionResult>;
  onDelete: (id: string) => Promise<ActionResult>;
  deleteHint?: string;
}

const PALETTE = ["#2E8C8A", "#4F8FC0", "#3F8F5E", "#5B5FC7", "#B08A3E", "#24467A", "#8A5CC2", "#C0533A", "#2F6F8F", "#7A8B3C"];

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Cor" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value.toLowerCase() === c.toLowerCase()}
          aria-label={c}
          onClick={() => onChange(c)}
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: c,
            cursor: "pointer",
            boxShadow: value.toLowerCase() === c.toLowerCase() ? "0 0 0 2px var(--ground), 0 0 0 4px var(--ink)" : "inset 0 0 0 1px rgba(255,255,255,.3)",
          }}
        />
      ))}
    </div>
  );
}

export function ListAdmin({ title, description, rows, withColor, select, text, addLabel, onSave, onDelete, deleteHint }: Props) {
  const [longText, setLongText] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PALETTE[0]);
  const [choice, setChoice] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open(row?: ListRow) {
    setEditing(row?.id ?? "new");
    setName(row?.name ?? "");
    setColor(row?.color ?? PALETTE[0]);
    setChoice(row?.selectValue ?? "");
    setLongText(row?.textValue ?? "");
    setError(null);
  }

  function run(fn: () => Promise<ActionResult>, after?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else after?.();
    });
  }

  const form = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            onSave({
              id: editing === "new" ? undefined : editing!,
              name,
              color,
              select: select ? choice || null : undefined,
              text: text ? longText : undefined,
            }),
          () => setEditing(null),
        );
      }}
      style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", borderRadius: 18, background: "var(--action-soft)" }}
    >
      <div>
        <label className="label" htmlFor={`name-${title}`}>Nome</label>
        <input id={`name-${title}`} className="field" autoFocus value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      {select && (
        <div>
          <label className="label" htmlFor={`sel-${title}`}>{select.label}</label>
          <select id={`sel-${title}`} className="select" value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">{select.emptyLabel}</option>
            {select.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      )}
      {text && (
        <div>
          <label className="label" htmlFor={`text-${title}`}>{text.label}</label>
          <textarea
            id={`text-${title}`}
            className="textarea"
            rows={10}
            spellCheck={false}
            style={{ fontFamily: "var(--font-code)", fontSize: 13.5, lineHeight: 1.6, resize: "vertical" }}
            value={longText}
            onChange={(e) => setLongText(e.target.value)}
          />
          <p className="hint">{text.hint}</p>
        </div>
      )}
      {withColor && (
        <div>
          <span className="label">Cor</span>
          <ColorPick value={color} onChange={setColor} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          <Check size={16} /> Salvar
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>
          Cancelar
        </button>
      </div>
    </form>
  );

  return (
    <section className="glass panel">
      <div className="panel-head" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 className="h2">{title}</h2>
          <p className="muted small" style={{ marginTop: 4, maxWidth: "60ch" }}>{description}</p>
        </div>
        {editing !== "new" && (
          <button type="button" className="btn btn-glass btn-sm" onClick={() => open()}>
            <Plus size={16} /> {addLabel}
          </button>
        )}
      </div>
      {error && <p className="notice notice-danger" role="alert" style={{ marginBottom: 12 }}>{error}</p>}
      {editing === "new" && <div style={{ marginBottom: 12 }}>{form}</div>}
      {rows.length === 0 && editing !== "new" && <p className="muted">Nada cadastrado ainda.</p>}
      <ul style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((r) =>
          editing === r.id ? (
            <li key={r.id} style={{ margin: "6px 0" }}>{form}</li>
          ) : (
            <li key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid var(--line)" }}>
              {withColor && <span className="op-swatch" style={{ "--c": r.color } as React.CSSProperties} aria-hidden="true" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                {r.note && <span className="muted small" style={{ display: "block" }}>{r.note}</span>}
              </span>
              {confirm === r.id ? (
                <>
                  <button type="button" className="btn btn-danger btn-sm" disabled={pending} onClick={() => run(() => onDelete(r.id), () => setConfirm(null))}>
                    Excluir {r.name}
                  </button>
                  <button type="button" className="icon-btn" aria-label="Cancelar" onClick={() => setConfirm(null)}>
                    <X size={17} />
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className="icon-btn" aria-label={`Editar ${r.name}`} title="Editar" onClick={() => open(r)}>
                    <Pencil size={16} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Excluir ${r.name}`} title={deleteHint ?? "Excluir"} onClick={() => setConfirm(r.id)}>
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
