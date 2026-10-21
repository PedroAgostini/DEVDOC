import { DocList, DocRow } from "@/components/DocRow";
import { DraftActions } from "@/components/DraftActions";
import { getReference, myDrafts, requireMe } from "@/lib/data";

export const metadata = { title: "Rascunhos" };

export default async function DraftsPage() {
  const me = await requireMe();
  const [ref, docs] = await Promise.all([getReference(), myDrafts(me.id)]);
  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Rascunhos</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Documentos novos e alterações ainda não publicadas. Só você vê o que está aqui.
        </p>
      </section>
      <section className="glass panel-flush">
        {docs.length ? (
          <DocList>
            {docs.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  paddingRight: 10,
                  boxShadow: i ? "0 -1px 0 var(--line)" : undefined,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <DocRow
                    doc={d}
                    categories={ref.categories}
                    operations={ref.operations}
                    href={`/d/${d.id}/editar`}
                    note="editado"
                    date={d.draft_updated_at ?? d.updated_at}
                  />
                </div>
                <DraftActions id={d.id} published={d.status === "published"} />
              </div>
            ))}
          </DocList>
        ) : (
          <div className="empty">
            <h2 className="h2">Nenhum rascunho</h2>
            <p>Tudo o que você escreveu já está publicado.</p>
          </div>
        )}
      </section>
    </div>
  );
}
