import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DevCredit } from "@/components/DevCredit";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <main className="solo-page">
      <section className="glass-strong panel" style={{ width: "min(440px, 100%)", padding: "clamp(24px, 4vw, 36px)" }}>
        <h1 className="h2" style={{ fontSize: 26 }}>Página não encontrada</h1>
        <p className="muted" style={{ marginTop: 8 }}>
          O endereço pode estar errado, ou o documento foi movido para a lixeira ou excluído.
        </p>
        <Link href="/" className="btn btn-primary btn-sm" style={{ marginTop: 20 }}>
          <ArrowLeft size={16} /> Voltar ao painel
        </Link>
      </section>
      <DevCredit compact />
    </main>
  );
}
