import { notFound } from "next/navigation";
import { Markdown } from "@/components/reader/Markdown";
import { getReference, requireMe } from "@/lib/data";
import { loadDocument } from "@/lib/doc";
import { longDate } from "@/lib/format";
import { PrintNow } from "./PrintNow";

export const metadata = { title: "Imprimir" };

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMe();
  const { id } = await params;
  const loaded = await loadDocument(id);
  if (!loaded) notFound();
  const { doc } = loaded;
  const ref = await getReference();
  const cat = ref.categories.find((c) => c.id === doc.category_id);
  const op = ref.operations.find((o) => o.id === doc.operation_id);
  const draft = doc.status === "draft";

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px 80px", background: "transparent" }}>
      <PrintNow />
      <p className="muted small">{[cat?.name, op?.name ?? "Conteúdo geral"].filter(Boolean).join(" · ")}</p>
      <h1 className="display" style={{ fontSize: 40, marginTop: 8 }}>{(draft ? doc.draft_title : doc.title) || "Sem título"}</h1>
      {(draft ? doc.draft_summary : doc.summary) && (
        <p className="lede" style={{ marginTop: 10 }}>{draft ? doc.draft_summary : doc.summary}</p>
      )}
      <p className="muted small" style={{ marginTop: 14 }}>
        {doc.author?.full_name} · {draft ? "rascunho" : `versão ${doc.version}, ${longDate(doc.published_at)}`}
      </p>
      <hr style={{ border: 0, height: 1, background: "var(--line-strong)", margin: "24px 0 28px" }} />
      <Markdown source={(draft ? doc.draft_md : doc.content_md) ?? ""} />
    </main>
  );
}
