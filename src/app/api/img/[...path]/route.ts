import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Images live in a private bucket; storage policies check the document's read access.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.map(decodeURIComponent).join("/");
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/i.test(key)) return new NextResponse("Imagem inválida", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("doc-images").download(key);
  if (error || !data) return new NextResponse("Imagem não encontrada", { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Cache-Control": "private, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
