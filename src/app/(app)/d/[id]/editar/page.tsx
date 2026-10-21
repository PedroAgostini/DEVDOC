import { notFound, redirect } from "next/navigation";
import { DocEditor } from "@/components/editor/DocEditor";
import { getMe, getMembers, getReference, getSupabase } from "@/lib/data";
import { loadDocument } from "@/lib/doc";
import { LEVEL_RANK } from "@/lib/types";

export const metadata = { title: "Editar" };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const loaded = await loadDocument(id);
  if (!loaded) notFound();
  const { doc, canEdit, isAuthor } = loaded;
  if (doc.deleted_at) redirect("/lixeira");
  if (!canEdit) redirect(`/d/${id}`);

  const me = await getMe();
  const supabase = await getSupabase();
  const [ref, members, tagRows] = await Promise.all([
    getReference(),
    getMembers(),
    supabase.from("documents").select("tags").not("tags", "eq", "{}").limit(400),
  ]);
  const knownTags = [...new Set(((tagRows.data ?? []) as { tags: string[] }[]).flatMap((r) => r.tags))].sort();

  return (
    <DocEditor
      id={doc.id}
      initial={{
        title: doc.draft_title ?? doc.title,
        summary: doc.draft_summary ?? doc.summary,
        md: doc.draft_md ?? doc.content_md,
      }}
      meta={{
        category_id: doc.category_id,
        operation_id: doc.operation_id,
        department_id: doc.department_id,
        owner_id: doc.owner_id,
        review_interval_months: doc.review_interval_months,
        clients: doc.clients,
        tags: doc.tags,
        visibility: doc.visibility,
        min_level: doc.min_level,
        groups: doc.groups,
        people: doc.people,
        editors: doc.editors,
      }}
      status={doc.status}
      hasUnpublished={doc.status === "published" && !!doc.draft_updated_at}
      savedAt={doc.draft_updated_at}
      reference={ref}
      members={members}
      authorId={doc.author_id}
      canChangeAccess={isAuthor || (!!me && LEVEL_RANK[me.level] >= LEVEL_RANK.admin)}
      knownTags={knownTags}
    />
  );
}
