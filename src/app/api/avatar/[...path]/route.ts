import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Profile photos live in a private bucket; only signed-in members can see them.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = path.map(decodeURIComponent).join("/");
  if (!/^[0-9a-f-]{36}\/[\w.-]+$/i.test(key)) return new NextResponse("Foto inválida", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("avatars").download(key);
  if (error || !data) return new NextResponse("Foto não encontrada", { status: 404 });

  return new NextResponse(data, {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      // Every upload gets a new file name, so the old one can be cached for good.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
