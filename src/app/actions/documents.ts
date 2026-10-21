"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe, getReference, getSupabase, getMembers } from "@/lib/data";
import { levelFromFile, visibilityFromFile, type DocMeta } from "@/lib/markdown";
import type { Level, Visibility } from "@/lib/types";
import { fail, type ActionResult } from "./util";

async function session() {
  const me = await getMe();
  if (!me) redirect("/login?erro=sem-acesso");
  return { me, supabase: await getSupabase() };
}

export async function createDocument(formData?: FormData) {
  const { me, supabase } = await session();
  const ref = await getReference();
  const cat = ref.categories.find((c) => c.slug === formData?.get("categoria"));
  const op = ref.operations.find((o) => o.slug === formData?.get("operacao"));
  const blank = formData?.get("modelo") === "nao";
  const { data, error } = await supabase
    .from("documents")
    .insert({
      author_id: me.id,
      category_id: cat?.id ?? null,
      operation_id: op?.id ?? null,
      review_interval_months: cat?.review_months ?? null,
      draft_title: "",
      draft_summary: "",
      draft_md: blank ? "" : (cat?.template_md ?? ""),
      draft_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(fail(error?.message).error);
  redirect(`/d/${data.id}/editar`);
}

export async function saveDraft(
  id: string,
  draft: { title: string; summary: string; md: string },
): Promise<ActionResult<{ at: string }>> {
  const { supabase } = await session();
  const at = new Date().toISOString();
  const { error } = await supabase
    .from("documents")
    .update({ draft_title: draft.title, draft_summary: draft.summary, draft_md: draft.md, draft_updated_at: at })
    .eq("id", id);
  if (error) return fail(error.message);
  return { ok: true, data: { at } };
}

export interface MetaPatch {
  category_id?: string | null;
  operation_id?: string | null;
  department_id?: string | null;
  owner_id?: string | null;
  review_interval_months?: number | null;
  tags?: string[];
  visibility?: Visibility;
  min_level?: Level;
  clients?: string[];
  groups?: string[];
  people?: string[];
  editors?: string[];
}

const RELATIONS = {
  clients: { table: "document_clients", column: "client_id" },
  groups: { table: "document_groups", column: "group_id" },
  people: { table: "document_people", column: "member_id" },
  editors: { table: "document_editors", column: "member_id" },
} as const;

export async function updateMeta(id: string, patch: MetaPatch): Promise<ActionResult> {
  const { supabase } = await session();
  const fields: Record<string, unknown> = {};
  for (const key of [
    "category_id",
    "operation_id",
    "department_id",
    "owner_id",
    "review_interval_months",
    "tags",
    "visibility",
    "min_level",
  ] as const) {
    if (patch[key] !== undefined) fields[key] = patch[key];
  }
  if (fields.tags) {
    fields.tags = [...new Set((fields.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
  if (Object.keys(fields).length) {
    const { error } = await supabase.from("documents").update(fields).eq("id", id);
    if (error) return fail(error.message);
  }
  for (const key of Object.keys(RELATIONS) as (keyof typeof RELATIONS)[]) {
    const ids = patch[key];
    if (!ids) continue;
    const { table, column } = RELATIONS[key];
    const del = await supabase.from(table).delete().eq("document_id", id);
    if (del.error) return fail(del.error.message);
    if (ids.length) {
      const ins = await supabase.from(table).insert(ids.map((v) => ({ document_id: id, [column]: v })));
      if (ins.error) return fail(ins.error.message);
    }
  }
  return { ok: true };
}

export async function publishDocument(id: string): Promise<ActionResult<{ version: number }>> {
  const { supabase } = await session();
  const { data, error } = await supabase.rpc("publish_document", { doc_id: id });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, data: { version: Number(data) } };
}

export async function markReviewed(id: string): Promise<ActionResult<{ at: string }>> {
  const { supabase } = await session();
  const { data, error } = await supabase.rpc("mark_reviewed", { doc_id: id });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, data: { at: String(data) } };
}

export async function discardDraft(id: string): Promise<ActionResult> {
  const { supabase } = await session();
  const { error } = await supabase
    .from("documents")
    .update({ draft_title: null, draft_summary: null, draft_md: null, draft_updated_at: null })
    .eq("id", id)
    .eq("status", "published");
  if (error) return fail(error.message);
  revalidatePath(`/d/${id}`);
  return { ok: true };
}

export async function trashDocument(id: string) {
  const { supabase } = await session();
  const { error } = await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(fail(error.message).error);
  revalidatePath("/", "layout");
  redirect("/lixeira");
}

export async function restoreDocument(id: string): Promise<ActionResult> {
  const { supabase } = await session();
  const { error } = await supabase.from("documents").update({ deleted_at: null }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteForever(id: string): Promise<ActionResult> {
  const { supabase } = await session();
  const { data: files } = await supabase.storage.from("doc-images").list(id);
  if (files?.length) await supabase.storage.from("doc-images").remove(files.map((f) => `${id}/${f.name}`));
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/lixeira");
  return { ok: true };
}

export async function toggleFavorite(id: string, on: boolean): Promise<ActionResult> {
  const { me, supabase } = await session();
  const { error } = on
    ? await supabase.from("favorites").upsert({ member_id: me.id, document_id: id })
    : await supabase.from("favorites").delete().eq("member_id", me.id).eq("document_id", id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function recordView(id: string) {
  const me = await getMe();
  if (!me) return;
  const supabase = await getSupabase();
  await Promise.all([
    supabase.from("document_views").upsert({ member_id: me.id, document_id: id, viewed_at: new Date().toISOString() }),
    supabase.rpc("track_doc_event", { doc_id: id, event: "view" }),
  ]);
}

/** Counts a copy of a code block or prompt; fire and forget. */
export async function trackCopy(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const supabase = await getSupabase();
  await supabase.rpc("track_doc_event", { doc_id: id, event: "copy" });
}

export async function togglePin(id: string, pinned: boolean): Promise<ActionResult> {
  const { supabase } = await session();
  const { error } = await supabase.from("documents").update({ pinned }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function restoreVersion(versionId: string) {
  const { supabase } = await session();
  const { data, error } = await supabase.rpc("restore_version", { version_id: versionId });
  if (error) throw new Error(fail(error.message).error);
  redirect(`/d/${data}/editar`);
}

export interface QuickResult {
  id: string;
  title: string;
  summary: string;
  category_id: string | null;
  operation_id: string | null;
  status: string;
}

export async function quickSearch(q: string): Promise<QuickResult[]> {
  const me = await getMe();
  if (!me || !q.trim()) return [];
  const supabase = await getSupabase();
  const { data } = await supabase
    .rpc("search_documents", { q: q.trim() })
    .select("id,title,draft_title,summary,category_id,operation_id,status")
    .limit(8);
  return ((data ?? []) as (QuickResult & { draft_title: string | null })[]).map((d) => ({
    ...d,
    title: (d.status === "draft" ? d.draft_title : d.title) || d.title || "Sem título",
  }));
}

/** Published documents to link to: recent ones for an empty query, else search results. */
export async function docSuggestions(q: string, exclude?: string): Promise<QuickResult[]> {
  const me = await getMe();
  if (!me) return [];
  const supabase = await getSupabase();
  const term = q.trim();
  const fields = "id,title,summary,category_id,operation_id,status";
  const query = term
    ? supabase.rpc("search_documents", { q: term }).select(fields)
    : supabase.from("documents").select(fields).order("published_at", { ascending: false });
  const { data } = await query.eq("status", "published").is("deleted_at", null).limit(8);
  return ((data ?? []) as QuickResult[]).filter((d) => d.id !== exclude);
}

/* Import ------------------------------------------------------------------------ */

export interface ImportPlan {
  title: string;
  summary: string;
  category_id: string | null;
  operation_id: string | null;
  department_id: string | null;
  clients: string[];
  tags: string[];
  visibility: Visibility;
  min_level: Level;
  groups: string[];
  people: string[];
  warnings: string[];
}

/** Resolves front matter names into ids and lists what could not be matched. */
export async function planImport(meta: DocMeta, fallbackTitle: string): Promise<ImportPlan> {
  const ref = await getReference();
  const members = await getMembers();
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const warnings: string[] = [];

  const cat = meta.categoria
    ? ref.categories.find((c) => norm(c.name) === norm(meta.categoria!) || c.slug === norm(meta.categoria!))
    : undefined;
  if (meta.categoria && !cat) warnings.push(`Categoria "${meta.categoria}" não existe; o documento fica sem categoria.`);

  const op = meta.operacao
    ? ref.operations.find((o) => norm(o.name) === norm(meta.operacao!) || o.slug === norm(meta.operacao!))
    : undefined;
  if (meta.operacao && !op && norm(meta.operacao) !== "geral") {
    warnings.push(`Operação "${meta.operacao}" não existe; o documento fica como conteúdo geral.`);
  }

  const dep = meta.departamento
    ? ref.departments.find((d) => norm(d.name) === norm(meta.departamento!) || d.slug === norm(meta.departamento!))
    : undefined;
  if (meta.departamento && !dep) warnings.push(`Departamento "${meta.departamento}" não existe; o documento fica sem departamento.`);

  const clients: string[] = [];
  for (const name of meta.clientes ?? []) {
    const c = ref.clients.find((x) => norm(x.name) === norm(name));
    if (c) clients.push(c.id);
    else warnings.push(`Cliente "${name}" não está cadastrado.`);
  }
  const groups: string[] = [];
  for (const name of meta.grupos ?? []) {
    const g = ref.groups.find((x) => norm(x.name) === norm(name));
    if (g) groups.push(g.id);
    else warnings.push(`Grupo "${name}" não existe.`);
  }
  const people: string[] = [];
  for (const email of meta.pessoas ?? []) {
    const p = members.find((m) => m.email === email.toLowerCase().trim());
    if (p) people.push(p.id);
    else warnings.push(`Pessoa "${email}" não está cadastrada.`);
  }

  let visibility = visibilityFromFile(meta.visibilidade);
  if (visibility === "groups" && !groups.length) visibility = "private";
  if (visibility === "people" && !people.length) visibility = "private";

  return {
    title: (meta.titulo ?? fallbackTitle).trim(),
    summary: (meta.resumo ?? "").trim(),
    category_id: cat?.id ?? null,
    operation_id: op?.id ?? null,
    department_id: dep?.id ?? null,
    clients,
    tags: (meta.tags ?? []).map((t) => t.toLowerCase().trim()).filter(Boolean),
    visibility,
    min_level: levelFromFile(meta.nivel_minimo),
    groups,
    people,
    warnings,
  };
}

export async function createImported(plan: ImportPlan, body: string): Promise<ActionResult<{ id: string }>> {
  const { me, supabase } = await session();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      author_id: me.id,
      category_id: plan.category_id,
      operation_id: plan.operation_id,
      department_id: plan.department_id,
      tags: plan.tags,
      visibility: plan.visibility,
      min_level: plan.min_level,
      draft_title: plan.title,
      draft_summary: plan.summary,
      draft_md: body,
      draft_updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return fail(error?.message);
  const rel = await updateMeta(data.id, { clients: plan.clients, groups: plan.groups, people: plan.people });
  if (!rel.ok) return rel;
  return { ok: true, data: { id: data.id } };
}
