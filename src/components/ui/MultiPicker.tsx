"use client";

import { useId, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

export interface PickOption {
  value: string;
  label: string;
  hint?: string;
}

interface Props {
  label: string;
  options: PickOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Free text entries (tags). */
  creatable?: boolean;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function MultiPicker({ label, options, value, onChange, placeholder, disabled, creatable }: Props) {
  const id = useId();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    const term = norm(q.trim());
    return options.filter((o) => !value.includes(o.value) && (!term || norm(`${o.label} ${o.hint ?? ""}`).includes(term))).slice(0, 8);
  }, [options, value, q]);

  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;

  function add(v: string) {
    const clean = creatable ? v.trim().replace(/^#/, "").toLowerCase() : v;
    if (!clean || value.includes(clean)) return;
    onChange([...value, clean]);
    setQ("");
    setActive(0);
  }

  return (
    <div style={{ position: "relative" }}>
      <label className="label" htmlFor={id}>{label}</label>
      <div className="chip-input" onClick={() => input.current?.focus()} aria-disabled={disabled}>
        {value.map((v) => (
          <span key={v} className="pill" style={{ "--c": "var(--action)", paddingRight: 4 } as React.CSSProperties}>
            {creatable ? `#${v}` : labelOf(v)}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remover ${labelOf(v)}`}
                style={{ display: "grid", placeItems: "center", width: 20, height: 20, borderRadius: 10, cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((x) => x !== v));
                }}
              >
                <X size={13} />
              </button>
            )}
          </span>
        ))}
        <input
          id={id}
          ref={input}
          value={q}
          disabled={disabled}
          placeholder={value.length ? "" : placeholder}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" || (creatable && e.key === ",")) {
              e.preventDefault();
              if (matches[active]) add(matches[active].value);
              else if (creatable && q.trim()) add(q);
            } else if (e.key === "Backspace" && !q && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${id}-list`}
        />
      </div>
      {open && !disabled && (matches.length > 0 || (creatable && q.trim())) && (
        <div id={`${id}-list`} role="listbox" className="glass-strong menu" style={{ left: 0, right: 0, top: "calc(100% + 6px)" }}>
          {matches.map((o, i) => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={i === active}
              data-selected={i === active}
              className="menu-item"
              onMouseDown={(e) => {
                e.preventDefault();
                add(o.value);
              }}
            >
              <span>
                {o.label}
                {o.hint && <span className="muted small" style={{ display: "block" }}>{o.hint}</span>}
              </span>
            </button>
          ))}
          {creatable && q.trim() && !matches.some((m) => norm(m.value) === norm(q.trim())) && (
            <button
              type="button"
              className="menu-item"
              data-selected={matches.length === 0}
              onMouseDown={(e) => {
                e.preventDefault();
                add(q);
              }}
            >
              Criar tag <strong>#{q.trim().replace(/^#/, "").toLowerCase()}</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
