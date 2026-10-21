import "server-only";
import { getMe, getSupabase } from "./data";
import type { DocFull } from "./types";

export interface LoadedDoc extends DocFull {
  clients: string[];
  groups: string[];
  people: string[];
  editors: string[];
}

/** A document the member can read, with its relations and edit right. RLS decides access. */
export async function loadDocument(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await getSupabase();
  const me = await getMe();
  const { data } = await supabase
    .from("documents")
    .select(
      "*, author:members!documents_author_id_fkey(id,full_name,avatar_url), document_clients(client_id), document_groups(group_id), document_people(member_id), document_editors(member_id)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const [{ data: canEdit }, fav] = await Promise.all([
    supabase.rpc("can_edit_document", { doc_id: id }),
    me
      ? supabase.from("favorites").select("document_id").eq("member_id", me.id).eq("document_id", id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const raw = data as DocFull & {
    document_clients: { client_id: string }[];
    document_groups: { group_id: string }[];
    document_people: { member_id: string }[];
    document_editors: { member_id: string }[];
  };
  const doc: LoadedDoc = {
    ...raw,
    clients: raw.document_clients.map((r) => r.client_id),
    groups: raw.document_groups.map((r) => r.group_id),
    people: raw.document_people.map((r) => r.member_id),
    editors: raw.document_editors.map((r) => r.member_id),
  };

  return {
    doc,
    canEdit: Boolean(canEdit),
    isAuthor: me?.id === doc.author_id,
    favorite: Boolean(fav.data),
  };
}
