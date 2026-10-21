import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Markdown } from "@/components/reader/Markdown";
import { restoreVersion } from "@/app/actions/documents";
import { getSupabase } from "@/lib/data";
import { loadDocument } from "@/lib/doc";
import { longDate, relative } from "@/lib/format";

export const metadata = { title: "Histórico" };

interface Version {
  id: string;
  version: number;
  title: string;
  summary: string;
  content_md: string;
  created_at: string;
  author: { full_name: string } | null;
}

export default async function HistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const { v } = await searchParams;
  const loaded = await loadDocument(id);
  if (!loaded) notFound();
  const { doc, canEdit } = loaded;

  const supabase = await getSupabase();
  const { data } = await supabase
    .from("document_versions")
    .select("id,version,title,summary,content_md,created_at,author:members(full_name)")
    .eq("document_id", id)
    .order("version", { ascending: false });
  const versions = (data ?? []) as unknown as Version[];
  const selected = versions.find((x) => x.id === v) ?? versions[0];

  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <Link href={`/d/${id}`} className="btn btn-quiet btn-sm" style={{ marginLeft: -12 }}>
          <ArrowLeft size={16} /> {doc.title || "Voltar"}
        </Link>
        <h1 className="display h1" style={{ marginTop: 8 }}>Histórico</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Cada publicação vira uma versão. Restaurar traz a versão de volta como rascunho, e ela só substitui a atual
          quando você publicar.
        </p>
      </section>

      {versions.length === 0 ? (
        <section className="glass empty">
          <h2 className="h2">Nenhuma versão publicada</h2>
          <p>As versões aparecem aqui a partir da primeira publicação.</p>
        </section>
      ) : (
        <div className="dash history-grid">
          <nav className="glass panel-flush" aria-label="Versões" style={{ padding: 8 }}>
            {versions.map((x) => (
              <Link
                key={x.id}
                href={`/d/${id}/historico?v=${x.id}`}
                className="nav-link"
                aria-current={x.id === selected?.id ? "page" : undefined}
                style={{ flexDirection: "column", alignItems: "flex-start", gap: 2 }}
              >
                <span style={{ fontWeight: 600 }}>
                  Versão {x.version}
                  {x.version === doc.version ? " · atual" : ""}
                </span>
                <span className="small" style={{ opacity: 0.8 }}>
                  {relative(x.created_at)} · {x.author?.full_name ?? "Autor removido"}
                </span>
              </Link>
            ))}
          </nav>

          {selected && (
            <article className="glass panel" style={{ padding: "clamp(22px, 4vw, 44px)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div>
                  <p className="muted small">Versão {selected.version}, publicada em {longDate(selected.created_at)}</p>
                  <h2 className="display" style={{ fontSize: 34, marginTop: 6 }}>{selected.title}</h2>
                </div>
                {canEdit && selected.version !== doc.version && (
                  <form action={restoreVersion.bind(null, selected.id)}>
                    <button type="submit" className="btn btn-glass">
                      <RotateCcw size={17} /> Restaurar como rascunho
                    </button>
                  </form>
                )}
              </div>
              {selected.summary && <p className="lede" style={{ marginTop: 10 }}>{selected.summary}</p>}
              <hr style={{ border: 0, height: 1, background: "var(--line)", margin: "24px 0 28px" }} />
              <Markdown source={selected.content_md} />
            </article>
          )}
        </div>
      )}
    </div>
  );
}
