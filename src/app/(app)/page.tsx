import Link from "next/link";
import { FilePlus2, Upload } from "lucide-react";
import { Bars } from "@/components/Bars";
import { DocList, DocRow } from "@/components/DocRow";
import { createDocument } from "@/app/actions/documents";
import {
  continueWhereLeft,
  draftCount,
  dueForReview,
  favoriteDocs,
  getCounts,
  getReference,
  recentlyUpdated,
  requireMe,
} from "@/lib/data";
import { greeting, plural } from "@/lib/format";

export const metadata = { title: "Painel geral" };

export default async function Dashboard() {
  const me = await requireMe();
  const [ref, counts, resume, recent, favorites, drafts, due] = await Promise.all([
    getReference(),
    getCounts(),
    continueWhereLeft(me.id, 3),
    recentlyUpdated(8),
    favoriteDocs(me.id, 6),
    draftCount(me.id),
    dueForReview(5),
  ]);

  const nothingYet = counts.total === 0 && resume.length === 0;

  return (
    <div className="stack" style={{ gap: 32 }}>
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">{greeting(me.full_name)}</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          {plural(counts.total, "documento publicado", "documentos publicados")} que você pode ver
          {drafts > 0 ? `, ${plural(drafts, "rascunho seu", "rascunhos seus")} em andamento.` : "."}
        </p>
      </section>

      {nothingYet ? (
        <section className="glass empty">
          <h2 className="h2">Nada publicado ainda</h2>
          <p>
            Comece escrevendo um documento, um prompt ou um código. Se você já tem arquivos .md, importe tudo de uma
            vez e os metadados do cabeçalho viram categoria, operação e visibilidade.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <form action={createDocument}>
              <button className="btn btn-primary" type="submit">
                <FilePlus2 size={18} /> Escrever o primeiro
              </button>
            </form>
            <Link href="/importar" className="btn btn-glass">
              <Upload size={18} /> Importar arquivos
            </Link>
          </div>
        </section>
      ) : (
        <div className="dash">
          <div className="stack">
            {due.length > 0 && (
              <section className="glass panel-flush" aria-labelledby="due-title">
                <div className="panel-head">
                  <h2 id="due-title" className="h2">Para revisar</h2>
                  <span className="muted small">
                    {due.length === 1 ? "1 documento com revisão vencida" : `${due.length} documentos com revisão vencida`}
                  </span>
                </div>
                <DocList>
                  {due.map((d) => (
                    <DocRow
                      key={d.id}
                      doc={d}
                      categories={ref.categories}
                      operations={ref.operations}
                      note="venceu"
                      date={d.review_due_at}
                      dense
                    />
                  ))}
                </DocList>
              </section>
            )}
            {resume.length > 0 && (
              <section className="glass panel-flush">
                <div className="panel-head">
                  <h2 className="h2">Continue de onde parou</h2>
                  <Link href="/rascunhos" className="link">
                    Rascunhos
                  </Link>
                </div>
                <DocList>
                  {resume.map(({ doc, at, kind }) => (
                    <DocRow
                      key={doc.id}
                      doc={doc}
                      categories={ref.categories}
                      operations={ref.operations}
                      href={kind === "draft" ? `/d/${doc.id}/editar` : `/d/${doc.id}`}
                      note={kind === "draft" ? "editado" : "aberto"}
                      date={at}
                      dense
                    />
                  ))}
                </DocList>
              </section>
            )}

            <section className="glass panel-flush">
              <div className="panel-head">
                <h2 className="h2">Atualizados recentemente</h2>
                <Link href="/documentos" className="link">
                  Ver todos
                </Link>
              </div>
              {recent.length ? (
                <DocList>
                  {recent.map((d) => (
                    <DocRow key={d.id} doc={d} categories={ref.categories} operations={ref.operations} dense />
                  ))}
                </DocList>
              ) : (
                <p className="muted" style={{ padding: "8px 16px 18px" }}>
                  Quando alguém publicar, aparece aqui.
                </p>
              )}
            </section>
          </div>

          <aside className="stack">
            <section className="glass panel">
              <div className="panel-head">
                <h2 className="h2">Por categoria</h2>
              </div>
              <Bars
                items={ref.categories.map((c) => ({
                  key: c.id,
                  label: c.name,
                  value: counts.byCategory.get(c.id) ?? 0,
                  color: c.color,
                  href: `/documentos?categoria=${c.slug}`,
                }))}
              />
            </section>

            <section className="glass panel">
              <div className="panel-head">
                <h2 className="h2">Por operação</h2>
              </div>
              <Bars
                items={ref.operations.map((o) => ({
                  key: o.id,
                  label: o.name,
                  value: counts.byOperation.get(o.id) ?? 0,
                  color: o.color,
                  href: `/operacoes/${o.slug}`,
                }))}
              />
            </section>

            <section className="glass panel">
              <div className="panel-head">
                <h2 className="h2">Por departamento</h2>
              </div>
              <Bars
                items={ref.departments
                  .map((d) => ({
                    key: d.id,
                    label: d.name,
                    value: counts.byDepartment.get(d.id) ?? 0,
                    color: d.color,
                    href: `/documentos?departamento=${d.slug}`,
                  }))
                  .filter((i) => i.value > 0)}
              />
              {ref.departments.every((d) => !counts.byDepartment.get(d.id)) && (
                <p className="muted small">Nenhum documento ligado a um departamento ainda.</p>
              )}
            </section>

            <section className="glass panel">
              <div className="panel-head">
                <h2 className="h2">Favoritos</h2>
                {favorites.length > 0 && (
                  <Link href="/favoritos" className="link">
                    Todos
                  </Link>
                )}
              </div>
              {favorites.length ? (
                <ul style={{ display: "flex", flexDirection: "column" }}>
                  {favorites.map((d) => (
                    <li key={d.id}>
                      <Link href={`/d/${d.id}`} className="bar-row" style={{ display: "block" }}>
                        {d.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">
                  Marque a estrela de um documento para ter ele sempre à mão aqui.
                </p>
              )}
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
