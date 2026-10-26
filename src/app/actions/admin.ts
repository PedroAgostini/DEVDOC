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
}): Promise<ActionResult<{ emailSent: boolean; reason?: string }>> {
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
  const invite = await sendInvite(email, input.full_name.trim());
  revalidatePath("/admin");
  return { ok: true, data: { emailSent: invite.sent, reason: invite.sent ? undefined : invite.reason } };
}

/** Plain-language reason for a failed invitation email. */
function inviteReason(message: string) {
  if (/rate limit/i.test(message)) {
    return "o limite de e-mails por hora foi atingido. Tente de novo mais tarde; com um SMTP próprio configurado no Supabase o limite deixa de ser um problema";
  }
  if (/not authorized|authorized/i.test(message)) {
    return "o e-mail padrão do Supabase só envia para quem faz parte do projeto no Supabase. Configure um SMTP próprio em Authentication > SMTP";
  }
  if (/error sending/i.test(message)) {
    return "o servidor de e-mail (SMTP) recusou o envio. Confira o usuário e a senha de app em Supabase > Authentication > Emails > SMTP Settings";
  }
  if (/already been registered|email_exists|already registered/i.test(message)) {
    return "essa pessoa já ativou a conta. Se esqueceu a senha, ela usa “Primeiro acesso ou esqueceu a senha?” na tela de login";
  }
  return message;
}

async function sendInvite(email: string, fullName: string): Promise<{ sent: true } | { sent: false; reason: string }> {
  try {
    const admin = createAdminClient();
    const origin = await siteOrigin();
    const res = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/auth/definir-senha`,
      data: { full_name: fullName },
    });
    return res.error ? { sent: false, reason: inviteReason(res.error.message) } : { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "erro desconhecido" };
  }
}

/** Sends the invitation again to someone who has not signed in yet (lost or expired email). */
export async function resendInvite(memberId: string): Promise<ActionResult> {
  const { me, supabase } = await adminSession();
  if (LEVEL_RANK[me.level] < LEVEL_RANK.admin) return { ok: false, error: "Só Admin ou Master reenvia convites." };
  const { data: m } = await supabase.from("members").select("email, full_name, active").eq("id", memberId).single();
  if (!m) return { ok: false, error: "Pessoa não encontrada." };
  if (!m.active) return { ok: false, error: "Reative o acesso antes de reenviar o convite." };
  const invite = await sendInvite(m.email, m.full_name);
  if (!invite.sent) return { ok: false, error: `O convite não saiu: ${invite.reason}.` };
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateMember(
  id: string,
  patch: { full_name?: string; email?: string; level?: Level; active?: boolean; operations?: string[]; departments?: string[] },
): Promise<ActionResult> {
  const { me, supabase } = await adminSession();

  // Email: only a Master, and the login email changes together with the record.
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    const { data: target } = await supabase.from("members").select("email, auth_user_id").eq("id", id).single();
    if (target && email !== target.email) {
      if (me.level !== "master") return { ok: false, error: "Só um Master altera o e-mail." };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: "Digite um e-mail válido." };
      const admin = createAdminClient();
      if (target.auth_user_id) {
        const auth = await admin.auth.admin.updateUserById(target.auth_user_id, { email, email_confirm: true });
        if (auth.error) {
          return { ok: false, error: /already|exists|registered/i.test(auth.error.message) ? "Esse e-mail já está em uso." : auth.error.message };
        }
      }
      const { error } = await supabase.from("members").update({ email }).eq("id", id);
      if (error) {
        if (target.auth_user_id) await admin.auth.admin.updateUserById(target.auth_user_id, { email: target.email, email_confirm: true });
        return fail(/duplicate|unique/i.test(error.message) ? "Esse e-mail já está em uso." : error.message);
      }
    }
  }

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

/** Lost phone: removes the person's authenticator so the next login asks to set up a new one. */
export async function resetMfa(memberId: string): Promise<ActionResult> {
  const { me, supabase } = await adminSession();
  if (LEVEL_RANK[me.level] < LEVEL_RANK.admin) return { ok: false, error: "Só Admin ou Master pode redefinir a verificação." };
  if (memberId === me.id) return { ok: false, error: "Peça a outro Admin ou Master para redefinir a sua." };
  const { data: target } = await supabase.from("members").select("auth_user_id, email, level").eq("id", memberId).single();
  if (!target) return { ok: false, error: "Pessoa não encontrada." };
  if (LEVEL_RANK[target.level as Level] >= LEVEL_RANK.admin && me.level !== "master") {
    return { ok: false, error: "Só um Master redefine a verificação de Admins e Masters." };
  }
  if (!target.auth_user_id) return { ok: false, error: "Essa pessoa ainda não entrou no DEVDOC." };

  const admin = createAdminClient();
  const { data: factors, error } = await admin.auth.admin.mfa.listFactors({ userId: target.auth_user_id });
  if (error) return fail(error.message);
  for (const f of factors?.factors ?? []) {
    const del = await admin.auth.admin.mfa.deleteFactor({ userId: target.auth_user_id, id: f.id });
    if (del.error) return fail(del.error.message);
  }
  // Ends open sessions too, so a stolen phone stops working at the next token refresh.
  const revoke = await admin.rpc("revoke_sessions", { p_user: target.auth_user_id });
  if (revoke.error) return fail(revoke.error.message);
  await admin.from("audit_log").insert({
    actor_id: me.id,
    action: "verificação em duas etapas redefinida",
    entity: "pessoa",
    entity_id: memberId,
    detail: { email: target.email },
  });
  return done();
}

export async function transferDocuments(from: string, to: string): Promise<ActionResult<{ moved: number }>> {
  const { supabase } = await adminSession();
  const { data, error } = await supabase.rpc("transfer_documents", { from_member: from, to_member: to });
  if (error) return fail(error.message);
  revalidatePath("/", "layout");
  return { ok: true, data: { moved: Number(data) } };
}

export async function deleteMember(id: string): Promise<ActionResult> {
  const { me, supabase } = await adminSession();
  if (me.level !== "master") return { ok: false, error: "Só um Master pode excluir pessoas." };
  if (id === me.id) return { ok: false, error: "Você não pode excluir sua própria conta." };

  const { error } = await supabase.rpc("delete_member", { p_member: id });
  if (error) return fail(error.message);
  // The profile photo goes too (LGPD: nothing of the person stays behind).
  try {
    const admin = createAdminClient();
    const { data: files } = await admin.storage.from("avatars").list(id);
    if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${id}/${f.name}`));
  } catch {
    // The record is already gone; a leftover photo is unreachable because the route needs a member.
  }
  return done();
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
