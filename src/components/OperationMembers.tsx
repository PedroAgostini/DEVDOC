"use client";

import { useState, useTransition } from "react";
import { UserMinus, UserPlus } from "lucide-react";
import { addToOperation, removeFromOperation } from "@/app/actions/admin";
import { initials } from "@/lib/format";
import { LEVEL_LABEL, type Member } from "@/lib/types";

interface Props {
  operationId: string;
  color: string;
  members: Member[];
  everyone: Member[];
  canManage: boolean;
}

export function OperationMembers({ operationId, color, members, everyone, canManage }: Props) {
  const [pick, setPick] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const candidates = everyone.filter((m) => m.active && !members.some((x) => x.id === m.id));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
      else setPick("");
    });
  }

  return (
    <div>
      {members.length === 0 && <p className="muted small">Ninguém nesta operação ainda.</p>}
      <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {members.map((m) => (
          <li key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
            <span className="avatar" style={{ "--c": color } as React.CSSProperties} aria-hidden="true">
              {m.avatar_url ? <img src={m.avatar_url} alt="" /> : initials(m.full_name || m.email)}
            </span>
            <span style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
              <span style={{ display: "block", fontWeight: 600 }}>{m.full_name || m.email}</span>
              <span className="muted small">{LEVEL_LABEL[m.level]}</span>
            </span>
            {canManage && (
              <button
                type="button"
                className="icon-btn"
                aria-label={`Tirar ${m.full_name || m.email} da operação`}
                title="Tirar da operação"
                disabled={pending}
                onClick={() => run(() => removeFromOperation(operationId, m.id))}
              >
                <UserMinus size={17} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {canManage && candidates.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <label className="sr-only" htmlFor={`add-${operationId}`}>Adicionar pessoa</label>
          <select id={`add-${operationId}`} className="select" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Adicionar pessoa</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-glass"
            disabled={!pick || pending}
            onClick={() => run(() => addToOperation(operationId, pick))}
            aria-label="Adicionar"
          >
            <UserPlus size={17} />
          </button>
        </div>
      )}
      {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
