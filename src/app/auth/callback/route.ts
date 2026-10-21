import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safePath } from "@/lib/format";

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const safeNext = safePath(url.searchParams.get("next"));
  const failure = (reason: string) => NextResponse.redirect(new URL(`/login?erro=${reason}`, url.origin));

  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    return failure(/Database error|NOT_INVITED|signup/i.test(providerError) ? "sem-acesso" : "link");
  }

  const supabase = await createClient();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return failure(/Database error/i.test(error.message) ? "sem-acesso" : "link");
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return failure("link");
  } else {
    return failure("link");
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
