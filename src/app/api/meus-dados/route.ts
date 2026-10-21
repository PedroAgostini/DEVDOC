import { NextResponse } from "next/server";
import { getMe, getSupabase } from "@/lib/data";

// LGPD art. 18: the person's own data, in a portable format. RLS still applies to every query.
export async function GET() {
  const me = await getMe();
  if (!me) return new NextResponse("Entre no DEVDOC para baixar seus dados.", { status: 401 });
  const supabase = await getSupabase();

  const [profile, ops, deps, authored, owned, favorites, views, sharedWithMe, coEditing] = await Promise.all([
    supabase.from("members").select("full_name,email,level,active,avatar_url,created_at").eq("id", me.id).single(),
    supabase.from("member_operations").select("operation:operations(name)").eq("member_id", me.id),
    supabase.from("member_departments").select("department:departments(name)").eq("member_id", me.id),
    supabase
      .from("documents")
      .select("id,title,draft_title,status,visibility,created_at,published_at,deleted_at")
      .eq("author_id", me.id),
    supabase.from("documents").select("id,title,review_due_at").eq("owner_id", me.id),
    supabase.from("favorites").select("created_at,document:documents(id,title)").eq("member_id", me.id),
    supabase.from("document_views").select("viewed_at,document:documents(id,title)").eq("member_id", me.id),
    supabase.from("document_people").select("document:documents(id,title)").eq("member_id", me.id),
    supabase.from("document_editors").select("document:documents(id,title)").eq("member_id", me.id),
  ]);

  const body = {
    gerado_em: new Date().toISOString(),
    observacao:
      "Visitas, cópias e buscas são guardadas de forma pseudonimizada (hash SHA-256 com segredo) e não podem ser ligadas a você, por isso não aparecem aqui.",
    perfil: profile.data,
    operacoes: (ops.data ?? []).map((r) => (r as unknown as { operation: { name: string } | null }).operation?.name),
    departamentos: (deps.data ?? []).map((r) => (r as unknown as { department: { name: string } | null }).department?.name),
    documentos_como_autor: authored.data ?? [],
    documentos_como_responsavel: owned.data ?? [],
    favoritos: favorites.data ?? [],
    visitas_recentes: views.data ?? [],
    compartilhados_com_voce: sharedWithMe.data ?? [],
    coedicao: coEditing.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-devdoc.json"',
      "Cache-Control": "no-store",
    },
  });
}
