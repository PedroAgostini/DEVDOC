"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe, getSupabase } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/markdown";
import { LEVEL_RANK, type Level } from "@/lib/types";
import { fail, type ActionResult } from "./util";

async function adminSession() {
  const me = await getMe();
  if (!me) redirect("/login?erro=sem-acesso");
  if (LEVEL_RANK[me.level] < LEVEL_RANK.gestor) redirect("/");
  return { me, supabase: await getSupabase() };
}

function done(): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
}

/* People ------------------------------------------------------------------------- */

export async function inviteMember(input: {
  email: string;
  full_name: string;
  level: Level;
  operations: string[];
  departments: string[];
}): Promise<ActionResult<{ emailSent: boolean }>> {
  const { me, supabase } = await adminSession();
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Digite um e-mail válido." };

  const { data: member, error } = await supabase
    .from("members")
    .insert({ email, full_name: input.full_name.trim(), level: input.level, invited_by: me.id })
    .select("id")
    .single();
  if (error || !member) return fail(error?.message);

  if (input.operations.length) {
    const ops = await supabase
      .from("member_operations")
      .insert(input.operations.map((operation_id) => ({ member_id: member.id, operation_id })));
    if (ops.error) return fail(ops.error.message);
  }
  if (input.departments.length) {
    const deps = await supabase
      .from("member_departments")
      .insert(input.departments.map((department_id) => ({ member_id: member.id, department_id })));
    if (deps.error) return fail(deps.error.message);
  }

  // The invitation email is a convenience: Google login or "receber link" also work.
  let emailSent = false;
  try {
    const admin = createAdminClient();
    const origin = await siteOrigin();
    const res = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/definir-senha`,
      data: { full_name: input.full_name.trim() },
    });
    emailSent = !res.error;
  } catch {
    emailSent = false;
  }
  revalidatePath("/admin");
  return { ok: true, data: { emailSent } };
}

export async function updateMember(
  id: string,
  patch: { full_name?: string; level?: Level; active?: boolean; operations?: string[]; departments?: string[] },
): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const fields: Record<string, unknown> = {};
  if (patch.full_name !== undefined) fields.full_name = patch.full_name.trim();
  if (patch.level !== undefined) fields.level = patch.level;
  if (patch.active !== undefined) fields.active = patch.active;
  if (Object.keys(fields).length) {
    const { error } = await supabase.from("members").update(fields).eq("id", id);
    if (error) return fail(error.message);
  }
  if (patch.operations) {
    const del = await supabase.from("member_operations").delete().eq("member_id", id);
    if (del.error) return fail(del.error.message);
    if (patch.operations.length) {
      const ins = await supabase
        .from("member_operations")
        .insert(patch.operations.map((operation_id) => ({ member_id: id, operation_id })));
      if (ins.error) return fail(ins.error.message);
    }
  }
  if (patch.departments) {
    const del = await supabase.from("member_departments").delete().eq("member_id", id);
    if (del.error) return fail(del.error.message);
    if (patch.departments.length) {
      const ins = await supabase
        .from("member_departments")
        .insert(patch.departments.map((department_id) => ({ member_id: id, department_id })));
      if (ins.error) return fail(ins.error.message);
    }
  }
  return done();
}

export async function saveDepartment(input: { id?: string; name: string; color: string }): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Dê um nome ao departamento." };
  const row = { name, slug: slugify(name), color: input.color };
  const { error } = input.id
    ? await supabase.from("departments").update(row).eq("id", input.id)
    : await supabase.from("departments").insert({ ...row, sort: 100 });
  if (error) return fail(error.message);
  return done();
}

export async function deleteDepartment(id: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase.from("departments").delete().eq("id", id);
  if (error) return fail(error.message);
  return done();
}

export async function transferDocuments(from: string, to: string): Promise<ActionResult<{ moved: number }>> {
  const { supabase } = await adminSession();
  const { data, error } = await supabase.rpc("transfer_documents", { from_member: from, to_member: to });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, data: { moved: Number(data) } };
}

/* Operation membership (Gestor of the operation or Admin) ------------------------------- */

export async function addToOperation(operationId: string, memberId: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase.from("member_operations").insert({ operation_id: operationId, member_id: memberId });
  if (error) return fail(error.message);
  return done();
}

export async function removeFromOperation(operationId: string, memberId: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase
    .from("member_operations")
    .delete()
    .eq("operation_id", operationId)
    .eq("member_id", memberId);
  if (error) return fail(error.message);
  return done();
}

/* Reference lists ------------------------------------------------------------------------ */

export async function saveOperation(input: { id?: string; name: string; color: string }): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Dê um nome à operação." };
  const row = { name, slug: slugify(name), color: input.color };
  const { error } = input.id
    ? await supabase.from("operations").update(row).eq("id", input.id)
    : await supabase.from("operations").insert({ ...row, sort: 100 });
  if (error) return fail(error.message);
  return done();
}

export async function deleteOperation(id: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase.from("operations").delete().eq("id", id);
  if (error) return fail(error.message);
  return done();
}

export async function saveClient(input: { id?: string; name: string; select?: string | null }): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Dê um nome ao cliente." };
  const row = { name, operation_id: input.select || null };
  const { error } = input.id
    ? await supabase.from("clients").update(row).eq("id", input.id)
    : await supabase.from("clients").insert(row);
  if (error) return fail(error.message);
  return done();
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return fail(error.message);
  return done();
}

export async function saveCategory(input: {
  id?: string;
  name: string;
  color: string;
  select?: string | null;
  text?: string;
}): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Dê um nome à categoria." };
  const row = {
    name,
    slug: slugify(name),
    color: input.color,
    review_months: input.select ? Number(input.select) : null,
    template_md: input.text ?? "",
  };
  const { error } = input.id
    ? await supabase.from("categories").update(row).eq("id", input.id)
    : await supabase.from("categories").insert({ ...row, sort: 100 });
  if (error) return fail(error.message);
  return done();
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) return fail(error.message);
  return done();
}

export async function saveGroup(input: { id?: string; name: string; members: string[] }): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Dê um nome ao grupo." };
  let id = input.id;
  if (id) {
    const { error } = await supabase
      .from("groups")
      .update({ name })
      .eq("id", id)
      .is("operation_id", null)
      .is("department_id", null);
    if (error) return fail(error.message);
  } else {
    const { data, error } = await supabase.from("groups").insert({ name }).select("id").single();
    if (error || !data) return fail(error?.message);
    id = data.id;
  }
  const del = await supabase.from("group_members").delete().eq("group_id", id);
  if (del.error) return fail(del.error.message);
  if (input.members.length) {
    const ins = await supabase.from("group_members").insert(input.members.map((member_id) => ({ group_id: id, member_id })));
    if (ins.error) return fail(ins.error.message);
  }
  return done();
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  const { supabase } = await adminSession();
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", id)
    .is("operation_id", null)
    .is("department_id", null);
  if (error) return fail(error.message);
  return done();
}

export async function signOut() {
  const supabase = await getSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}
