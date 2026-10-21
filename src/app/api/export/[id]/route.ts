import JSZip from "jszip";
import { NextResponse, type NextRequest } from "next/server";
import { getMembers, getReference, getSupabase } from "@/lib/data";
import { loadDocument } from "@/lib/doc";
import { imageUrls, slugify, VISIBILITY_TO_FILE, withFrontMatter, type DocMeta } from "@/lib/markdown";
import { LEVEL_LABEL } from "@/lib/types";

const IMG_PREFIX = "/api/img/";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("formato") === "zip" ? "zip" : "md";
  const loaded = await loadDocument(id);
  if (!loaded) return new NextResponse("Documento não encontrado", { status: 404 });
  const { doc } = loaded;

  const [ref, members] = await Promise.all([getReference(), getMembers()]);
  const useDraft = doc.status === "draft";
  const title = (useDraft ? doc.draft_title : doc.title) || "Sem título";
  const body = (useDraft ? doc.draft_md : doc.content_md) ?? "";

  const meta: DocMeta = {
    titulo: title,
    resumo: (useDraft ? doc.draft_summary : doc.summary) || undefined,
    categoria: ref.categories.find((c) => c.id === doc.category_id)?.name,
    operacao: ref.operations.find((o) => o.id === doc.operation_id)?.name ?? "geral",
    departamento: ref.departments.find((d) => d.id === doc.department_id)?.name,
    clientes: ref.clients.filter((c) => doc.clients.includes(c.id)).map((c) => c.name),
    tags: doc.tags,
    visibilidade: VISIBILITY_TO_FILE[doc.visibility],
    nivel_minimo: doc.visibility === "level" ? LEVEL_LABEL[doc.min_level] : undefined,
    grupos: doc.visibility === "groups" ? ref.groups.filter((g) => doc.groups.includes(g.id)).map((g) => g.name) : undefined,
    pessoas: doc.visibility === "people" ? members.filter((m) => doc.people.includes(m.id)).map((m) => m.email) : undefined,
    versao: doc.version || undefined,
    atualizado_em: doc.published_at ?? doc.updated_at,
  };

  const base = slugify(title) || "documento";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;

  if (format === "md") {
    const text = withFrontMatter(meta, body.replaceAll(`](${IMG_PREFIX}`, `](${origin}${IMG_PREFIX}`));
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.md"`,
      },
    });
  }

  const zip = new JSZip();
  const supabase = await getSupabase();
  let rewritten = body;
  for (const url of imageUrls(body)) {
    if (!url.startsWith(IMG_PREFIX)) continue;
    const key = url.slice(IMG_PREFIX.length);
    const { data } = await supabase.storage.from("doc-images").download(key);
    if (!data) continue;
    const name = key.split("/").pop()!;
    zip.file(`imagens/${name}`, await data.arrayBuffer());
    rewritten = rewritten.replaceAll(url, `imagens/${name}`);
  }
  zip.file(`${base}.md`, withFrontMatter(meta, rewritten));
  const buffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${base}.zip"`,
    },
  });
}
