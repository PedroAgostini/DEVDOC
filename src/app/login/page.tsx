import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; voltar?: string }>;
}) {
  const sp = await searchParams;
  const me = await getMe();
  if (me && sp.erro !== "sem-acesso") redirect(sp.voltar?.startsWith("/") ? sp.voltar : "/");

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 420px), 1fr))",
        alignItems: "center",
        gap: 48,
        padding: "48px clamp(16px, 6vw, 96px)",
        maxWidth: 1240,
        margin: "0 auto",
      }}
    >
      <section>
        <div className="wordmark" style={{ fontSize: 40, padding: 0, marginBottom: 28 }}>
          <span className="wordmark-mark" style={{ gridTemplateColumns: "repeat(3, 8px)", height: 34, gap: 3 }}>
            <i />
            <i />
            <i />
          </span>
          devdoc
        </div>
        <h1 className="display" style={{ fontSize: "clamp(36px, 5vw, 60px)", maxWidth: 14 + "ch" }}>
          O que o time sabe, num lugar só.
        </h1>
        <p className="lede" style={{ marginTop: 20, maxWidth: "44ch" }}>
          Documentação, prompts e códigos em markdown, organizados por operação e cliente, com quem pode ver
          cada coisa definido por você.
        </p>
      </section>
      <LoginForm erro={sp.erro} voltar={sp.voltar} />
    </main>
  );
}
