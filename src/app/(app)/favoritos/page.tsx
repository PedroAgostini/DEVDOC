import { DocList, DocRow } from "@/components/DocRow";
import { favoriteDocs, getReference, requireMe } from "@/lib/data";

export const metadata = { title: "Favoritos" };

export default async function FavoritesPage() {
  const me = await requireMe();
  const [ref, docs] = await Promise.all([getReference(), favoriteDocs(me.id)]);
  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Favoritos</h1>
        <p className="lede" style={{ marginTop: 10 }}>O que você marcou com a estrela, para achar sem buscar.</p>
      </section>
      <section className="glass panel-flush">
        {docs.length ? (
          <DocList>
            {docs.map((d) => (
              <DocRow key={d.id} doc={d} categories={ref.categories} operations={ref.operations} />
            ))}
          </DocList>
        ) : (
          <div className="empty">
            <h2 className="h2">Nenhum favorito ainda</h2>
            <p>Abra um documento e toque na estrela ao lado do título.</p>
          </div>
        )}
      </section>
    </div>
  );
}
