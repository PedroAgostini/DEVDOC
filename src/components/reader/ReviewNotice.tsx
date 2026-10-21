"use client";

import { useState, useTransition } from "react";
import { CalendarClock, Check } from "lucide-react";
import { markReviewed } from "@/app/actions/documents";

/** Shown on an overdue document; editors confirm it is still right. */
export function ReviewNotice({ id, since, canEdit }: { id: string; since: string; canEdit: boolean }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <p className="notice no-print" role="status" style={{ margin: "16px 0 0" }}>
        <Check size={18} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
        Revisão registrada. A próxima data foi recalculada.
      </p>
    );
  }

  return (
    <div className="notice no-print" style={{ margin: "16px 0 0", alignItems: "center", flexWrap: "wrap" }}>
      <CalendarClock size={18} aria-hidden="true" style={{ flex: "none" }} />
      <span style={{ flex: 1, minWidth: 200 }}>
        A revisão deste documento venceu em {since}. Confira se o conteúdo ainda está certo.
        {error && <span className="error-text" style={{ display: "block" }}>{error}</span>}
      </span>
      {canEdit && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await markReviewed(id);
              if (r.ok) setDone(true);
              else setError(r.error);
            })
          }
        >
          <Check size={16} /> Marcar como revisado
        </button>
      )}
    </div>
  );
}
