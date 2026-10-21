import Link from "next/link";
import { redirect } from "next/navigation";
import { SearchX } from "lucide-react";
import { CategoryIcon } from "@/components/icons";
import { DOC_FIELDS, getReference, getSupabase, requireMe } from "@/lib/data";
import { plural, relative } from "@/lib/format";
import { LEVEL_RANK, type DocSummary } from "@/lib/types";

export const metadata = { title: "Métricas" };

const PERIODS = [7, 30, 90];

interface Metric {
  document_id: string;
  views: number;
  viewers: number;
  copies: number;
}

interface Miss {
  q: string;
  times: number;
  people: number;
  last_at: string;
}

export default async function MetricsPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const me = await requireMe();
  if (LEVEL_RANK[me.level] < LEVEL_RANK.gestor) redirect("/");
  const { dias } = await searchParams;
  const days = PERIODS.includes(Number(dias)) ? Number(dias) : 30;

  const supabase = await getSupabase();
  const [ref, metricsRes, missesRes, publishedRes] = await Promise.all([
    getReference(),
    supabase.rpc("doc_metrics", { days }),
    supabase.rpc("top_search_misses", { days }),
    supabase.from("documents").select(DOC_FIELDS).eq("status", "published").is("deleted_at", null),
  ]);

  const metrics = ((metricsRes.data ?? []) as Metric[]).map((m) => ({
    ...m,
    views: Number(m.views),
    viewers: Number(m.viewers),
    copies: Number(m.copies),
  }));
  const misses = ((missesRes.data ?? []) as Miss[]).map((m) => ({ ...m, times: Number(m.times), people: Number(m.people) }));
  const published = (publishedRes.data ?? []) as unknown as DocSummary[];
  const byId = new Map(published.map((d) => [d.id, d]));

  const withDoc = metrics.filter((m) => byId.has(m.document_id));
  const mostViewed = [...withDoc].sort((a, b) => b.views - a.views).slice(0, 10);
  const mostCopied = [...withDoc].filter((m) => m.copies > 0).sort((a, b) => b.copies - a.copies).slice(0, 8);
  const seen = new Set(metrics.filter((m) => m.views > 0).map((m) => m.document_id));
  const unseen = published.filter((d) => !seen.has(d.id));

  const totalViews = metrics.reduce((s, m) => s + m.views, 0);
  const totalCopies = metrics.reduce((s, m) => s + m.copies, 0);
  const totalMisses = misses.reduce((s, m) => s + m.times, 0);

  const docCell = (id: string) => {
    const d = byId.get(id)!;
    const cat = ref.categories.find((c) => c.id === d.category_id);
    const op = ref.operations.find((o) => o.id === d.operation_id);
    return (
      <Link href={`/d/${d.id}`} style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <span className="pane" style={{ "--c": cat?.color ?? "#56667f", width: 28, height: 34 } as React.CSSProperties} aria-hidden="true">
          <CategoryIcon slug={cat?.slug} size={14} />
        </span>
        <span style={{ minWidth: 0 }}>
          <span className="doc-title" style={{ display: "block", fontSize: 15 }}>{d.title}</span>
          <span className="muted small">{[cat?.name, op?.name ?? "Conteúdo geral"].filter(Boolean).join(" · ")}</span>
        </span>
      </Link>
    );
  };

  return (
    <div className="stack">
      <section style={{ paddingTop: 8, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 className="display h1">Métricas</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            Nos últimos {days} dias: {plural(totalViews, "visita", "visitas")}, {plural(totalCopies, "cópia", "cópias")} de
            código ou prompt e {plural(totalMisses, "busca", "buscas")} sem resultado.
          </p>
        </div>
        <nav className="glass tabs" aria-label="Período">
          {PERIODS.map((p) => (
            <Link key={p} href={`/metricas?dias=${p}`} className="tab" aria-current={p === days ? "page" : undefined}>
              {p} dias
            </Link>
          ))}
        </nav>
      </section>

      <div className="dash">
        <div className="stack">
          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Mais vistos</h2>
            </div>
            {mostViewed.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th style={{ textAlign: "right" }}>Visitas</th>
                      <th style={{ textAlign: "right" }}>Pessoas</th>
                      <th style={{ textAlign: "right" }}>Cópias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostViewed.map((m) => (
                      <tr key={m.document_id}>
                        <td>{docCell(m.document_id)}</td>
                        <td className="tabular" style={{ textAlign: "right" }}>{m.views}</td>
                        <td className="tabular" style={{ textAlign: "right" }}>{m.viewers}</td>
                        <td className="tabular" style={{ textAlign: "right" }}>{m.copies}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Nenhuma visita registrada no período.</p>
            )}
          </section>

          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Mais copiados</h2>
              <span className="muted small">Blocos de código e prompts</span>
            </div>
            {mostCopied.length ? (
              <table className="table">
                <tbody>
                  {mostCopied.map((m) => (
                    <tr key={m.document_id}>
                      <td>{docCell(m.document_id)}</td>
                      <td className="tabular" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {plural(m.copies, "cópia", "cópias")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Ninguém copiou código ou prompt no período.</p>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Buscas sem resultado</h2>
            </div>
            <p className="muted small" style={{ marginTop: -6, marginBottom: 14 }}>
              Cada termo aqui é um documento que o time procurou e não achou.
            </p>
            {misses.length ? (
              <ul style={{ display: "flex", flexDirection: "column" }}>
                {misses.map((m) => (
                  <li key={m.q}>
                    <Link href={`/documentos?q=${encodeURIComponent(m.q)}`} className="bar-row" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <SearchX size={16} aria-hidden="true" style={{ flex: "none", color: "var(--ink-3)" }} />
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.q}</span>
                      <span className="muted small tabular" style={{ whiteSpace: "nowrap" }}>
                        {m.times}× · {relative(m.last_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">Toda busca do período encontrou algo.</p>
            )}
          </section>

          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Sem visitas</h2>
              <span className="muted small tabular">{unseen.length}</span>
            </div>
            {unseen.length ? (
              <>
                <p className="muted small" style={{ marginTop: -6, marginBottom: 10 }}>
                  Publicados que ninguém abriu no período. Vale revisar, juntar com outro ou arquivar.
                </p>
                <ul>
                  {unseen.slice(0, 8).map((d) => (
                    <li key={d.id}>
                      <Link href={`/d/${d.id}`} className="bar-row" style={{ display: "block" }}>
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="muted small">Todos os documentos publicados foram abertos no período.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
