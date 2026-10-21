import { TrashActions } from "@/components/TrashActions";
import { CategoryIcon } from "@/components/icons";
import { getReference, trashDocs } from "@/lib/data";
import { relative } from "@/lib/format";
import { displayTitle } from "@/lib/types";

export const metadata = { title: "Lixeira" };

const DAY = 86400000;

export default async function TrashPage() {
  const [ref, docs] = await Promise.all([getReference(), trashDocs()]);
  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Lixeira</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Documentos excluídos ficam aqui por 30 dias. Depois disso somem de vez, junto com as imagens.
        </p>
      </section>
      <section className="glass panel-flush">
        {docs.length ? (
          <div className="doc-list">
            {docs.map((d) => {
              const cat = ref.categories.find((c) => c.id === d.category_id);
              const left = Math.max(0, 30 - Math.floor((Date.now() - new Date(d.deleted_at!).getTime()) / DAY));
              return (
                <div key={d.id} className="doc-row">
                  <span className="pane" style={{ "--c": cat?.color ?? "#56667f" } as React.CSSProperties} aria-hidden="true">
                    <CategoryIcon slug={cat?.slug} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="doc-title" style={{ display: "block" }}>{displayTitle(d)}</span>
                    <span className="doc-summary" style={{ display: "block" }}>
                      Excluído {relative(d.deleted_at)}. {left === 1 ? "Resta 1 dia." : `Restam ${left} dias.`}
                    </span>
                  </span>
                  <TrashActions id={d.id} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty">
            <h2 className="h2">Lixeira vazia</h2>
            <p>Nada foi excluído nos últimos 30 dias.</p>
          </div>
        )}
      </section>
    </div>
  );
}
