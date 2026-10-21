import Link from "next/link";
import { notFound } from "next/navigation";
import { Bars } from "@/components/Bars";
import { NewDocButton } from "@/components/NewDocChooser";
import { DocList, DocRow } from "@/components/DocRow";
import { OperationMembers } from "@/components/OperationMembers";
import { SetLight } from "@/components/SetLight";
import { getCounts, getMembers, getReference, getSupabase, recentlyUpdated, requireMe } from "@/lib/data";
import { plural } from "@/lib/format";
import { LEVEL_RANK, type Member } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ref = await getReference();
  return { title: ref.operations.find((o) => o.slug === slug)?.name ?? "Operação" };
}

export default async function OperationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireMe();
  const ref = await getReference();
  const op = ref.operations.find((o) => o.slug === slug);
  if (!op) notFound();

  const supabase = await getSupabase();
  const [counts, docs, everyone, memberRows] = await Promise.all([
    getCounts(),
    recentlyUpdated(40, op.id),
    getMembers(),
    supabase.from("member_operations").select("member_id").eq("operation_id", op.id),
  ]);

  const memberIds = new Set((memberRows.data ?? []).map((r: { member_id: string }) => r.member_id));
  const members = everyone.filter((m: Member) => memberIds.has(m.id) && m.active);
  const canManage =
    LEVEL_RANK[me.level] >= LEVEL_RANK.admin || (me.level === "gestor" && memberIds.has(me.id));
  const pinned = docs.filter((d) => d.pinned);
  const rest = docs.filter((d) => !d.pinned);
  const total = counts.byOperation.get(op.id) ?? 0;

  return (
    <div className="stack" style={{ gap: 32 }}>
      <SetLight color={op.color} />
      <section style={{ display: "flex", alignItems: "flex-end", gap: 24, flexWrap: "wrap", paddingTop: 8 }}>
        <span aria-hidden="true" style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          {[64, 84, 56].map((h, i) => (
            <span
              key={i}
              className="pane"
              style={{ "--c": op.color, width: 18, height: h, borderRadius: 9, opacity: 1 - i * 0.18 } as React.CSSProperties}
            />
          ))}
        </span>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 className="display h1">{op.name}</h1>
          <p className="lede" style={{ marginTop: 10 }}>
            {plural(total, "documento", "documentos")}, {plural(members.length, "pessoa", "pessoas")}.
          </p>
        </div>
        <NewDocButton categories={ref.categories} operation={op.slug} label="Novo nesta operação" />
      </section>

      <div className="dash">
        <div className="stack">
          {pinned.length > 0 && (
            <section className="glass panel-flush">
              <div className="panel-head">
                <h2 className="h2">Fixados</h2>
              </div>
              <DocList>
                {pinned.map((d) => (
                  <DocRow key={d.id} doc={d} categories={ref.categories} operations={ref.operations} showOperation={false} />
                ))}
              </DocList>
            </section>
          )}
          <section className="glass panel-flush">
            <div className="panel-head">
              <h2 className="h2">Documentos</h2>
              <Link href={`/documentos?operacao=${op.slug}`} className="link">
                Filtrar e buscar
              </Link>
            </div>
            {rest.length ? (
              <DocList>
                {rest.map((d) => (
                  <DocRow key={d.id} doc={d} categories={ref.categories} operations={ref.operations} showOperation={false} />
                ))}
              </DocList>
            ) : (
              <p className="muted" style={{ padding: "8px 16px 18px" }}>
                {pinned.length ? "Os demais documentos aparecem aqui." : "Nada publicado nesta operação ainda."}
              </p>
            )}
          </section>
        </div>

        <aside className="stack">
          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Por categoria</h2>
            </div>
            <Bars
              items={ref.categories.map((c) => ({
                key: c.id,
                label: c.name,
                value: counts.matrix.get(`${op.id}|${c.id}`) ?? 0,
                color: c.color,
                href: `/documentos?operacao=${op.slug}&categoria=${c.slug}`,
              }))}
            />
          </section>
          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Clientes</h2>
            </div>
            {ref.clients.some((c) => c.operation_id === op.id) ? (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {ref.clients
                  .filter((c) => c.operation_id === op.id)
                  .map((c) => (
                    <Link key={c.id} href={`/documentos?cliente=${c.id}`} className="pill pill-outline">
                      {c.name}
                    </Link>
                  ))}
              </div>
            ) : (
              <p className="muted small">Nenhum cliente atribuído a esta operação. Um Admin atribui em Administração, Clientes.</p>
            )}
          </section>
          <section className="glass panel">
            <div className="panel-head">
              <h2 className="h2">Pessoas</h2>
            </div>
            <OperationMembers
              operationId={op.id}
              color={op.color}
              members={members}
              everyone={everyone}
              canManage={canManage}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
