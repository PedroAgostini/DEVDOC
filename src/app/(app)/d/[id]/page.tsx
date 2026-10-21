import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Eye, Lock, Users, UsersRound, Globe2, Layers } from "lucide-react";
import { Markdown } from "@/components/reader/Markdown";
import { PromptFiller } from "@/components/reader/PromptFiller";
import { DocActions } from "@/components/reader/DocActions";
import { SetLight } from "@/components/SetLight";
import { CategoryIcon } from "@/components/icons";
import { getMembers, getReference, getSupabase } from "@/lib/data";
import { loadDocument } from "@/lib/doc";
import { initials, longDate, fullDay } from "@/lib/format";
import { ReviewNotice } from "@/components/reader/ReviewNotice";
import { extractVariables, outline } from "@/lib/markdown";
import { LEVEL_LABEL, type Visibility } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadDocument(id);
  return { title: loaded?.doc.title || "Documento" };
}

const VIS_ICON: Record<Visibility, typeof Globe2> = {
  all: Globe2,
  level: Layers,
  groups: UsersRound,
  people: Users,
  private: Lock,
};

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadDocument(id);
  if (!loaded) notFound();
  const { doc, canEdit, favorite } = loaded;
  if (doc.status === "draft") redirect(`/d/${id}/editar`);

  const supabase = await getSupabase();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [ref, members, events, backlinkRows] = await Promise.all([
    getReference(),
    getMembers(),
    supabase.from("doc_events").select("kind,member_id").eq("document_id", id).gte("created_at", since),
    supabase
      .from("doc_links")
      .select("source:documents!doc_links_source_id_fkey(id,title,category_id)")
      .eq("target_id", id),
  ]);
  const backlinks = ((backlinkRows.data ?? []) as unknown as { source: { id: string; title: string; category_id: string | null } | null }[])
    .map((r) => r.source)
    .filter((s): s is { id: string; title: string; category_id: string | null } => !!s);
  const usage = ((events.data ?? []) as { kind: string; member_id: string | null }[]).reduce(
    (acc, e) => {
      if (e.kind === "view") {
        acc.views += 1;
        if (e.member_id) acc.people.add(e.member_id);
      } else acc.copies += 1;
      return acc;
    },
    { views: 0, copies: 0, people: new Set<string>() },
  );
  const cat = ref.categories.find((c) => c.id === doc.category_id);
  const op = ref.operations.find((o) => o.id === doc.operation_id);
  const dep = ref.departments.find((d) => d.id === doc.department_id);
  const vars = extractVariables(doc.content_md);
  const toc = outline(doc.content_md);
  const VisIcon = VIS_ICON[doc.visibility];

  const visibilityText = (() => {
    switch (doc.visibility) {
      case "all":
        return "Todos do DEVDOC";
      case "level":
        return `${LEVEL_LABEL[doc.min_level]} e acima`;
      case "groups":
        return ref.groups.filter((g) => doc.groups.includes(g.id)).map((g) => g.name).join(", ") || "Grupos";
      case "people":
        return `${doc.people.length} ${doc.people.length === 1 ? "pessoa" : "pessoas"} escolhidas`;
      case "private":
        return "Só o autor";
    }
  })();
  const clients = ref.clients.filter((c) => doc.clients.includes(c.id));
  const editors = members.filter((m) => doc.editors.includes(m.id));

  return (
    <div className="dash reader-grid" data-doc-id={doc.id}>
      <SetLight color={op?.color} />
      <article className="glass panel" style={{ padding: "clamp(22px, 4vw, 48px)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {cat && (
            <Link href={`/documentos?categoria=${cat.slug}`} className="pill" style={{ "--c": cat.color } as React.CSSProperties}>
              <CategoryIcon slug={cat.slug} size={13} /> {cat.name}
            </Link>
          )}
          {op ? (
            <Link href={`/operacoes/${op.slug}`} className="pill pill-dot" style={{ "--c": op.color } as React.CSSProperties}>
              {op.name}
            </Link>
          ) : (
            <span className="pill pill-outline">Conteúdo geral</span>
          )}
          {dep && (
            <Link href={`/documentos?departamento=${dep.slug}`} className="pill pill-dot" style={{ "--c": dep.color } as React.CSSProperties}>
              {dep.name}
            </Link>
          )}
        </div>

        <h1 className="display" style={{ fontSize: "clamp(32px, 4vw, 48px)" }}>{doc.title}</h1>
        {doc.summary && <p className="lede" style={{ marginTop: 12, fontSize: 18 }}>{doc.summary}</p>}

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", margin: "24px 0 8px" }}>
          <span className="avatar" style={{ "--c": op?.color ?? "var(--action)" } as React.CSSProperties} aria-hidden="true">
            {doc.author?.avatar_url ? <img src={doc.author.avatar_url} alt="" /> : initials(doc.author?.full_name ?? "")}
          </span>
          <span style={{ lineHeight: 1.35, flex: 1, minWidth: 200 }}>
            <span style={{ display: "block", fontWeight: 600 }}>{doc.author?.full_name}</span>
            <span className="muted small">
              Publicado em {longDate(doc.published_at)} · versão {doc.version}
            </span>
          </span>
          <DocActions
            id={doc.id}
            favorite={favorite}
            canEdit={canEdit}
            canPin={canEdit && !!doc.operation_id}
            pinned={doc.pinned}
          />
        </div>

        {doc.review_due_at && new Date(doc.review_due_at).getTime() < Date.now() && (
          <ReviewNotice id={doc.id} since={fullDay(doc.review_due_at)} canEdit={canEdit} />
        )}

        {canEdit && doc.draft_updated_at && (
          <p className="notice no-print" style={{ margin: "16px 0 0" }}>
            <Eye size={18} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <span>
              Há alterações salvas que ainda não foram publicadas.{" "}
              <Link className="link" href={`/d/${doc.id}/editar`}>Continuar editando</Link>
            </span>
          </p>
        )}

        {vars.length > 0 && (
          <div className="only-narrow no-print" style={{ marginTop: 24 }}>
            <PromptFiller source={doc.content_md} variables={vars} bare />
          </div>
        )}

        <hr style={{ border: 0, height: 1, background: "var(--line)", margin: "28px 0 32px" }} />
        {doc.content_md.trim() ? (
          <Markdown source={doc.content_md} />
        ) : (
          <p className="muted">Este documento ainda não tem conteúdo.</p>
        )}
      </article>

      <aside className="stack reader-aside">
        {vars.length > 0 && (
          <div className="only-wide">
            <PromptFiller source={doc.content_md} variables={vars} />
          </div>
        )}

        {toc.length > 1 && (
          <nav className="glass panel" aria-label="Neste documento">
            <h2 className="h2" style={{ fontSize: 18, marginBottom: 10 }}>Neste documento</h2>
            <ul>
              {toc.map((h) => (
                <li key={h.id + h.text}>
                  <a href={`#${h.id}`} className="bar-row" style={{ display: "block", paddingLeft: h.depth === 3 ? 26 : 10, fontSize: 14 }}>
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {backlinks.length > 0 && (
          <nav className="glass panel" aria-label="Mencionado em">
            <h2 className="h2" style={{ fontSize: 18, marginBottom: 10 }}>Mencionado em</h2>
            <ul>
              {backlinks.map((b) => {
                const c = ref.categories.find((x) => x.id === b.category_id);
                return (
                  <li key={b.id}>
                    <Link href={`/d/${b.id}`} className="bar-row" style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                      <span className="op-swatch" style={{ "--c": c?.color ?? "#56667f", height: 14, width: 6 } as React.CSSProperties} aria-hidden="true" />
                      {b.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <section className="glass panel">
          <h2 className="h2" style={{ fontSize: 18, marginBottom: 14 }}>Detalhes</h2>
          <dl style={{ display: "grid", gap: 14, fontSize: 14 }}>
            <div>
              <dt className="muted small">Quem pode ver</dt>
              <dd style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                <VisIcon size={16} aria-hidden="true" /> {visibilityText}
              </dd>
            </div>
            <div>
              <dt className="muted small">Uso nos últimos 30 dias</dt>
              <dd style={{ marginTop: 4 }} className="tabular">
                {usage.views === 0
                  ? "Nenhuma visita registrada"
                  : `${usage.views} ${usage.views === 1 ? "visita" : "visitas"} de ${usage.people.size} ${usage.people.size === 1 ? "pessoa" : "pessoas"}`}
                {usage.copies > 0 && ` · copiado ${usage.copies} ${usage.copies === 1 ? "vez" : "vezes"}`}
              </dd>
            </div>
            <div>
              <dt className="muted small">Responsável</dt>
              <dd style={{ marginTop: 4 }}>
                {members.find((m) => m.id === (doc.owner_id ?? doc.author_id))?.full_name ?? "Sem responsável"}
              </dd>
            </div>
            <div>
              <dt className="muted small">Próxima revisão</dt>
              <dd style={{ marginTop: 4 }}>
                {doc.review_due_at ? fullDay(doc.review_due_at) : "Sem revisão periódica"}
              </dd>
            </div>
            {clients.length > 0 && (
              <div>
                <dt className="muted small">Clientes</dt>
                <dd style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {clients.map((c) => (
                    <Link key={c.id} href={`/documentos?cliente=${c.id}`} className="pill pill-outline">{c.name}</Link>
                  ))}
                </dd>
              </div>
            )}
            {doc.tags.length > 0 && (
              <div>
                <dt className="muted small">Tags</dt>
                <dd style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {doc.tags.map((t) => (
                    <Link key={t} href={`/documentos?tag=${encodeURIComponent(t)}`} className="pill pill-outline">#{t}</Link>
                  ))}
                </dd>
              </div>
            )}
            {doc.code_languages.length > 0 && (
              <div>
                <dt className="muted small">Linguagens</dt>
                <dd style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {doc.code_languages.map((l) => (
                    <Link key={l} href={`/documentos?linguagem=${encodeURIComponent(l)}`} className="pill pill-outline">{l}</Link>
                  ))}
                </dd>
              </div>
            )}
            {editors.length > 0 && (
              <div>
                <dt className="muted small">Coeditores</dt>
                <dd style={{ marginTop: 4 }}>{editors.map((m) => m.full_name || m.email).join(", ")}</dd>
              </div>
            )}
          </dl>
        </section>
      </aside>
    </div>
  );
}
