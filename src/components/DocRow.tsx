import Link from "next/link";
import { Lock, Pin } from "lucide-react";
import { relative } from "@/lib/format";
import { displayTitle, type Category, type Department, type DocSummary, type Operation } from "@/lib/types";
import { CategoryIcon } from "./icons";

interface Props {
  doc: DocSummary;
  categories: Category[];
  operations: Operation[];
  departments?: Department[];
  href?: string;
  note?: string;
  date?: string | null;
  showOperation?: boolean;
  /** Two-line row for panels: title, then pills and summary on one line. */
  dense?: boolean;
}

/** One document, with its furniture always in the same place. */
export function DocRow({ doc, categories, operations, departments, href, note, date, showOperation = true, dense }: Props) {
  const cat = categories.find((c) => c.id === doc.category_id);
  const op = operations.find((o) => o.id === doc.operation_id);
  const dep = departments?.find((d) => d.id === doc.department_id);
  const title = doc.status === "draft" ? displayTitle(doc) : doc.title || "Sem título";
  const when = date ?? doc.published_at ?? doc.updated_at;

  if (dense) {
    return (
      <Link href={href ?? `/d/${doc.id}`} className="doc-row dense">
        <span className="pane" style={{ "--c": cat?.color ?? "#56667f" } as React.CSSProperties} aria-hidden="true">
          <CategoryIcon slug={cat?.slug} size={15} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="doc-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
            {doc.visibility === "private" && <Lock size={13} aria-label="Só para mim" />}
          </span>
          <span className="dense-line">
            {cat && <span className="pill" style={{ "--c": cat.color } as React.CSSProperties}>{cat.name}</span>}
            {showOperation && op && (
              <span className="pill pill-dot" style={{ "--c": op.color } as React.CSSProperties}>{op.name}</span>
            )}
            {doc.status === "draft" && <span className="pill pill-outline">Rascunho</span>}
            {doc.summary && <span className="doc-summary">{doc.summary}</span>}
          </span>
        </span>
        <span className="doc-meta">{note ? `${note} ${relative(when)}` : relative(when)}</span>
      </Link>
    );
  }

  return (
    <Link href={href ?? `/d/${doc.id}`} className="doc-row">
      <span className="pane" style={{ "--c": cat?.color ?? "#56667f" } as React.CSSProperties} aria-hidden="true">
        <CategoryIcon slug={cat?.slug} size={16} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="doc-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {doc.pinned && <Pin size={14} aria-label="Fixado" />}
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
          {doc.visibility === "private" && <Lock size={13} aria-label="Só para mim" />}
        </span>
        {doc.summary && <span className="doc-summary" style={{ display: "block" }}>{doc.summary}</span>}
        <span className="doc-tags">
          {cat && (
            <span className="pill" style={{ "--c": cat.color } as React.CSSProperties}>
              {cat.name}
            </span>
          )}
          {showOperation && op && (
            <span className="pill pill-dot" style={{ "--c": op.color } as React.CSSProperties}>
              {op.name}
            </span>
          )}
          {dep && <span className="pill pill-outline">{dep.name}</span>}
          {doc.status === "draft" && <span className="pill pill-outline">Rascunho</span>}
          {doc.status === "published" && doc.draft_updated_at && note === undefined && (
            <span className="pill pill-outline">Alterações não publicadas</span>
          )}
          {doc.tags.slice(0, 3).map((t) => (
            <span key={t} className="pill pill-outline">
              #{t}
            </span>
          ))}
        </span>
      </span>
      <span className="doc-meta">
        {doc.author?.full_name && <span style={{ display: "block" }}>{doc.author.full_name}</span>}
        <span style={{ display: "block" }}>{note ? `${note} ${relative(when)}` : relative(when)}</span>
      </span>
    </Link>
  );
}

export function DocList({ children }: { children: React.ReactNode }) {
  return <div className="doc-list">{children}</div>;
}
