import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Category, Client, Department, DocSummary, Group, Member, Operation, Reference } from "./types";

export const DOC_FIELDS =
  "id,title,summary,status,category_id,operation_id,department_id,author_id,owner_id,review_interval_months,reviewed_at,review_due_at,visibility,min_level,tags,code_languages,published_at,updated_at,draft_title,draft_updated_at,deleted_at,pinned,version,author:members!documents_author_id_fkey(id,full_name,avatar_url)";

export const getSupabase = cache(createClient);

/** The signed-in member, or null when the account has no active access. */
export const getMe = cache(async (): Promise<Member | null> => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("members")
    .select("id,email,full_name,avatar_url,level,active,auth_user_id")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  return (data as Member) ?? null;
});

export async function requireMe() {
  const me = await getMe();
  if (!me) redirect("/login?erro=sem-acesso");
  return me;
}

export const getReference = cache(async (): Promise<Reference> => {
  const supabase = await getSupabase();
  const [ops, deps, cats, clients, groups] = await Promise.all([
    supabase.from("operations").select("id,name,slug,color,sort").order("sort").order("name"),
    supabase.from("departments").select("id,name,slug,color,sort").order("sort").order("name"),
    supabase.from("categories").select("id,name,slug,color,sort,template_md,review_months").order("sort").order("name"),
    supabase.from("clients").select("id,name,operation_id").order("name"),
    supabase.from("groups").select("id,name,operation_id,department_id").order("name"),
  ]);
  return {
    operations: (ops.data ?? []) as Operation[],
    departments: (deps.data ?? []) as Department[],
    categories: (cats.data ?? []) as Category[],
    clients: (clients.data ?? []) as Client[],
    groups: (groups.data ?? []) as Group[],
  };
});

export const getCounts = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.rpc("doc_counts");
  const byCategory = new Map<string | null, number>();
  const byOperation = new Map<string | null, number>();
  const byDepartment = new Map<string | null, number>();
  const matrix = new Map<string, number>();
  let total = 0;
  for (const row of (data ?? []) as {
    category_id: string | null;
    operation_id: string | null;
    department_id: string | null;
    total: number;
  }[]) {
    const n = Number(row.total);
    total += n;
    byCategory.set(row.category_id, (byCategory.get(row.category_id) ?? 0) + n);
    byOperation.set(row.operation_id, (byOperation.get(row.operation_id) ?? 0) + n);
    byDepartment.set(row.department_id, (byDepartment.get(row.department_id) ?? 0) + n);
    const key = `${row.operation_id}|${row.category_id}`;
    matrix.set(key, (matrix.get(key) ?? 0) + n);
  }
  return { total, byCategory, byOperation, byDepartment, matrix };
});

export const getMembers = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("members")
    .select("id,email,full_name,avatar_url,level,active,auth_user_id,created_at")
    .order("full_name");
  return (data ?? []) as Member[];
});

export interface ListFilters {
  q?: string;
  categoria?: string;
  operacao?: string;
  departamento?: string;
  cliente?: string;
  autor?: string;
  tag?: string;
  linguagem?: string;
  visibilidade?: string;
  de?: string;
  ate?: string;
  ordem?: string;
  pagina?: string;
}

export const PAGE_SIZE = 30;

/** Published documents the member can read, narrowed by URL filters. */
export async function listDocuments(f: ListFilters) {
  const supabase = await getSupabase();
  const ref = await getReference();
  const q = f.q?.trim();

  const fields = f.cliente ? `${DOC_FIELDS},document_clients!inner(client_id)` : DOC_FIELDS;
  let query = (q ? supabase.rpc("search_documents", { q }) : supabase.from("documents"))
    .select(fields, { count: "exact" })
    .eq("status", "published")
    .is("deleted_at", null);

  const cat = ref.categories.find((c) => c.slug === f.categoria);
  if (cat) query = query.eq("category_id", cat.id);
  const op = ref.operations.find((o) => o.slug === f.operacao);
  if (f.operacao === "geral") query = query.is("operation_id", null);
  else if (op) query = query.eq("operation_id", op.id);
  const dep = ref.departments.find((d) => d.slug === f.departamento);
  if (dep) query = query.eq("department_id", dep.id);
  if (f.cliente) query = query.eq("document_clients.client_id", f.cliente);
  if (f.autor) query = query.eq("author_id", f.autor);
  if (f.tag) query = query.contains("tags", [f.tag]);
  if (f.linguagem) query = query.contains("code_languages", [f.linguagem.toLowerCase()]);
  if (f.visibilidade) query = query.eq("visibility", f.visibilidade);
  if (f.de) query = query.gte("published_at", `${f.de}T00:00:00-03:00`);
  if (f.ate) query = query.lte("published_at", `${f.ate}T23:59:59-03:00`);

  if (!q || f.ordem) {
    if (f.ordem === "titulo") query = query.order("title", { ascending: true });
    else if (f.ordem === "antigos") query = query.order("published_at", { ascending: true });
    else query = query.order("published_at", { ascending: false });
  }

  const page = Math.max(1, Number(f.pagina) || 1);
  query = query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const { data, count, error } = await query;
  // A search with no result is a gap in the documentation worth showing in the metrics.
  if (q && !error && (count ?? 0) === 0) await supabase.rpc("log_search_miss", { query: q });
  return { docs: (data ?? []) as unknown as DocSummary[], count: count ?? 0, page, error: error?.message };
}

export async function recentlyUpdated(limit = 8, operationId?: string) {
  const supabase = await getSupabase();
  let query = supabase
    .from("documents")
    .select(DOC_FIELDS)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (operationId) query = query.eq("operation_id", operationId);
  const { data } = await query;
  return (data ?? []) as unknown as DocSummary[];
}

/** Own drafts and recently opened documents, newest first. */
export async function continueWhereLeft(memberId: string, limit = 5) {
  const supabase = await getSupabase();
  const [drafts, views] = await Promise.all([
    supabase
      .from("documents")
      .select(DOC_FIELDS)
      .eq("author_id", memberId)
      .is("deleted_at", null)
      .not("draft_updated_at", "is", null)
      .order("draft_updated_at", { ascending: false })
      .limit(limit),
    supabase
      .from("document_views")
      .select(`viewed_at, document:documents(${DOC_FIELDS})`)
      .eq("member_id", memberId)
      .order("viewed_at", { ascending: false })
      .limit(limit * 2),
  ]);

  const items: { doc: DocSummary; at: string; kind: "draft" | "view" }[] = [];
  for (const d of (drafts.data ?? []) as unknown as DocSummary[]) {
    items.push({ doc: d, at: d.draft_updated_at!, kind: "draft" });
  }
  for (const v of (views.data ?? []) as unknown as { viewed_at: string; document: DocSummary | null }[]) {
    if (!v.document || v.document.deleted_at) continue;
    if (items.some((i) => i.doc.id === v.document!.id)) continue;
    items.push({ doc: v.document, at: v.viewed_at, kind: "view" });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

/** Overdue documents the member owns or manages through an operation. */
export async function dueForReview(limit = 6) {
  const supabase = await getSupabase();
  const { data } = await supabase.rpc("docs_due_for_review").select(DOC_FIELDS).limit(limit);
  return (data ?? []) as unknown as DocSummary[];
}

export async function favoriteDocs(memberId: string, limit?: number) {
  const supabase = await getSupabase();
  let query = supabase
    .from("favorites")
    .select(`created_at, document:documents(${DOC_FIELDS})`)
    .eq("member_id", memberId)
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data } = await query;
  return ((data ?? []) as unknown as { document: DocSummary | null }[])
    .map((f) => f.document)
    .filter((d): d is DocSummary => !!d && !d.deleted_at);
}

export async function myDrafts(memberId: string) {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("documents")
    .select(DOC_FIELDS)
    .eq("author_id", memberId)
    .is("deleted_at", null)
    .or("status.eq.draft,draft_updated_at.not.is.null")
    .order("updated_at", { ascending: false });
  return (data ?? []) as unknown as DocSummary[];
}

export async function trashDocs() {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("documents")
    .select(DOC_FIELDS)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  return (data ?? []) as unknown as DocSummary[];
}

export async function draftCount(memberId: string) {
  const supabase = await getSupabase();
  const { count } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("author_id", memberId)
    .is("deleted_at", null)
    .or("status.eq.draft,draft_updated_at.not.is.null");
  return count ?? 0;
}

export async function favoriteCount(memberId: string) {
  const supabase = await getSupabase();
  const { count } = await supabase
    .from("favorites")
    .select("document_id", { count: "exact", head: true })
    .eq("member_id", memberId);
  return count ?? 0;
}
