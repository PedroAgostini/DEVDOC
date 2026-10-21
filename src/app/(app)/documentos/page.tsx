import Link from "next/link";
import { Suspense } from "react";
import { DocList, DocRow } from "@/components/DocRow";
import { FilterBar } from "@/components/FilterBar";
import { SetLight } from "@/components/SetLight";
import { getMembers, getReference, listDocuments, PAGE_SIZE, type ListFilters } from "@/lib/data";
import { plural } from "@/lib/format";

export const metadata = { title: "Documentos" };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<ListFilters> }) {
  const filters = await searchParams;
  const [ref, members, result] = await Promise.all([getReference(), getMembers(), listDocuments(filters)]);
  const op = ref.operations.find((o) => o.slug === filters.operacao);
  const dep = ref.departments.find((d) => d.slug === filters.departamento);
  const pages = Math.max(1, Math.ceil(result.count / PAGE_SIZE));

  const pageHref = (p: number) => {
    const sp = new URLSearchParams(Object.entries(filters).filter(([, v]) => v) as [string, string][]);
    sp.set("pagina", String(p));
    return `/documentos?${sp.toString()}`;
  };

  return (
    <div className="stack">
      {(op || dep) && <SetLight color={(op ?? dep)!.color} />}
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">{op ? `Documentos de ${op.name}` : dep ? `Documentos de ${dep.name}` : "Documentos"}</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          {filters.q ? `${plural(result.count, "resultado", "resultados")} para “${filters.q}”.` : `${plural(result.count, "documento", "documentos")}.`}
        </p>
      </section>

      <Suspense>
        <FilterBar
          categories={ref.categories}
          operations={ref.operations}
          departments={ref.departments}
          clients={ref.clients}
          members={members}
        />
      </Suspense>

      <section className="glass panel-flush" aria-live="polite">
        {result.error && <p className="notice notice-danger" style={{ margin: 10 }}>{result.error}</p>}
        {result.docs.length ? (
          <DocList>
            {result.docs.map((d) => (
              <DocRow key={d.id} doc={d} categories={ref.categories} operations={ref.operations} departments={ref.departments} />
            ))}
          </DocList>
        ) : (
          <div className="empty">
            <h2 className="h2">Nada com esses filtros</h2>
            <p>Tente menos filtros ou outras palavras. A busca procura no título, no resumo, nas tags e no texto.</p>
          </div>
        )}
      </section>

      {pages > 1 && (
        <nav aria-label="Páginas" style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          {result.page > 1 && <Link className="btn btn-glass btn-sm" href={pageHref(result.page - 1)}>Anterior</Link>}
          <span className="muted small tabular">
            Página {result.page} de {pages}
          </span>
          {result.page < pages && <Link className="btn btn-glass btn-sm" href={pageHref(result.page + 1)}>Próxima</Link>}
        </nav>
      )}
    </div>
  );
}
