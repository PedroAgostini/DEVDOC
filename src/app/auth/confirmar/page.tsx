"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safePath } from "@/lib/format";

// Invitation links created by the server (and some email links) arrive with the session in the
// URL fragment (#access_token=...), which never reaches the server. This page reads it in the browser.
function Confirm() {
  const supabase = useMemo(createClient, []);
  const router = useRouter();
  const params = useSearchParams();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const next = safePath(params.get("next"));
    const hash = new URLSearchParams(window.location.hash.slice(1));
    // Drop the tokens from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    const error = hash.get("error_description") ?? hash.get("error");
    if (error) {
      router.replace(`/login?erro=${/Database error|NOT_INVITED|signup/i.test(error) ? "sem-acesso" : "link"}`);
      return;
    }
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) {
      router.replace("/login?erro=link");
      return;
    }
    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
      if (sessionError) router.replace("/login?erro=link");
      else {
        router.replace(next);
        router.refresh();
      }
    });
  }, [supabase, router, params]);

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 16 }}>
      <p className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Loader2 size={16} className="spin" /> Entrando
      </p>
    </main>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
