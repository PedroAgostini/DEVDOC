import Link from "next/link";
import { redirect } from "next/navigation";
import { GroupsAdmin } from "@/components/admin/GroupsAdmin";
import { ListAdmin } from "@/components/admin/ListAdmin";
import { PeopleAdmin } from "@/components/admin/PeopleAdmin";
import {
  deleteCategory,
  deleteClient,
  deleteDepartment,
  deleteOperation,
  saveCategory,
  saveClient,
  saveDepartment,
  saveOperation,
} from "@/app/actions/admin";
import { getCounts, getMembers, getReference, getSupabase, requireMe } from "@/lib/data";
import { LEVEL_RANK } from "@/lib/types";
import { longDate } from "@/lib/format";

export const metadata = { title: "Administração" };

const TABS = [
  { id: "pessoas", label: "Pessoas" },
  { id: "operacoes", label: "Operações" },
  { id: "departamentos", label: "Departamentos" },
  { id: "clientes", label: "Clientes" },
  { id: "categorias", label: "Categorias" },
  { id: "grupos", label: "Grupos" },
];

interface AuditRow {
  id: number;
  at: string;
  action: string;
  entity: string;
  detail: Record<string, string>;
  actor: { full_name: string; email: string } | null;
}

async function AuditTable() {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("audit_log")
    .select("id,at,action,entity,detail,actor:members(full_name,email)")
    .order("at", { ascending: false })
    .limit(300);
  const rows = (data ?? []) as unknown as AuditRow[];
  return (
    <section className="glass panel">
      <div className="panel-head" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 className="h2">Auditoria</h2>
          <p className="muted small" style={{ marginTop: 4, maxWidth: "64ch" }}>
            Quem liberou ou mudou acessos, níveis, visibilidade e compartilhamentos. Só Masters veem esta lista, ninguém
            consegue editá-la, e documentos privados aparecem sem título.
          </p>
        </div>
      </div>
      {rows.length ? (
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Quem</th>
                <th>O que</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="small tabular" style={{ whiteSpace: "nowrap" }}>{longDate(r.at)}</td>
                  <td className="small">{r.actor?.full_name || r.actor?.email || "Sistema"}</td>
                  <td>{r.action}</td>
                  <td className="small muted">
                    {Object.entries(r.detail ?? {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Nada registrado ainda.</p>
      )}
    </section>
  );
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const me = await requireMe();
  if (LEVEL_RANK[me.level] < LEVEL_RANK.admin) redirect("/");
  const { aba = "pessoas" } = await searchParams;

  const supabase = await getSupabase();
  const [ref, members, counts, memberOps, memberDeps, groupMembers] = await Promise.all([
    getReference(),
    getMembers(),
    getCounts(),
    supabase.from("member_operations").select("member_id,operation_id"),
    supabase.from("member_departments").select("member_id,department_id"),
    supabase.from("group_members").select("group_id,member_id"),
  ]);
  const ops = (memberOps.data ?? []) as { member_id: string; operation_id: string }[];
  const deps = (memberDeps.data ?? []) as { member_id: string; department_id: string }[];
  const opPeople = Object.fromEntries(ref.operations.map((o) => [o.id, ops.filter((x) => x.operation_id === o.id).length]));
  const depPeople = Object.fromEntries(ref.departments.map((d) => [d.id, deps.filter((x) => x.department_id === d.id).length]));
  const autoGroupPeople = Object.fromEntries(
    ref.groups
      .filter((g) => g.operation_id || g.department_id)
      .map((g) => [g.id, g.operation_id ? opPeople[g.operation_id] ?? 0 : depPeople[g.department_id!] ?? 0]),
  );

  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Administração</h1>
        <p className="lede" style={{ marginTop: 10 }}>Quem entra, como o conteúdo se organiza e quem enxerga o quê.</p>
      </section>

      <nav className="glass tabs" aria-label="Seções" style={{ alignSelf: "flex-start", maxWidth: "100%" }}>
        {[...TABS, ...(me.level === "master" ? [{ id: "auditoria", label: "Auditoria" }] : [])].map((t) => (
          <Link key={t.id} href={`/admin?aba=${t.id}`} className="tab" aria-current={aba === t.id ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>

      {aba === "pessoas" && (
        <PeopleAdmin
          members={members}
          memberOps={ops}
          memberDeps={deps}
          operations={ref.operations}
          departments={ref.departments}
          myLevel={me.level}
          myId={me.id}
        />
      )}
      {aba === "departamentos" && (
        <ListAdmin
          title="Departamentos"
          description="Cada pessoa pode estar em vários. Cada departamento vira um grupo automático de acesso e pode ser escolhido no documento."
          rows={ref.departments.map((d) => ({
            id: d.id,
            name: d.name,
            color: d.color,
            note: `${depPeople[d.id] ?? 0} pessoas · ${counts.byDepartment.get(d.id) ?? 0} documentos`,
          }))}
          withColor
          addLabel="Novo departamento"
          onSave={saveDepartment}
          onDelete={deleteDepartment}
        />
      )}
      {aba === "operacoes" && (
        <ListAdmin
          title="Operações"
          description="Cada operação tem painel próprio, cor própria e vira um grupo automático. Excluir só funciona sem documentos ligados."
          rows={ref.operations.map((o) => ({
            id: o.id,
            name: o.name,
            color: o.color,
            note: `${counts.byOperation.get(o.id) ?? 0} documentos · ${opPeople[o.id] ?? 0} pessoas`,
          }))}
          withColor
          addLabel="Nova operação"
          onSave={saveOperation}
          onDelete={deleteOperation}
        />
      )}
      {aba === "clientes" && (
        <ListAdmin
          title="Clientes"
          description="Clientes são etiquetas para organizar e filtrar, cada um atendido por uma operação. Não entram no sistema."
          rows={ref.clients.map((c) => ({
            id: c.id,
            name: c.name,
            selectValue: c.operation_id,
            note: ref.operations.find((o) => o.id === c.operation_id)?.name ?? "Sem operação",
          }))}
          select={{
            label: "Operação que atende",
            emptyLabel: "Nenhuma",
            options: ref.operations.map((o) => ({ value: o.id, label: o.name })),
          }}
          addLabel="Novo cliente"
          onSave={saveClient}
          onDelete={deleteClient}
        />
      )}
      {aba === "categorias" && (
        <ListAdmin
          title="Categorias"
          description="Aparecem no filtro, no painel e na cor de cada documento. Excluir deixa os documentos sem categoria."
          rows={ref.categories.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            selectValue: c.review_months ? String(c.review_months) : null,
            textValue: c.template_md,
            note: `${counts.byCategory.get(c.id) ?? 0} documentos · ${c.template_md.trim() ? "com modelo" : "sem modelo"} · ${
              c.review_months ? `revisar a cada ${c.review_months} meses` : "sem revisão"
            }`,
          }))}
          select={{
            label: "Revisão padrão dos novos documentos",
            emptyLabel: "Não precisa revisar",
            options: [3, 6, 12].map((m) => ({ value: String(m), label: `A cada ${m} meses` })),
          }}
          text={{
            label: "Modelo (markdown)",
            hint: "Aparece já preenchido quando alguém cria um documento desta categoria. Use {{variavel}} em prompts.",
          }}
          withColor
          addLabel="Nova categoria"
          onSave={saveCategory}
          onDelete={deleteCategory}
        />
      )}
      {aba === "auditoria" && me.level === "master" && <AuditTable />}
      {aba === "grupos" && (
        <GroupsAdmin
          groups={ref.groups}
          groupMembers={(groupMembers.data ?? []) as { group_id: string; member_id: string }[]}
          autoCounts={autoGroupPeople}
          members={members}
        />
      )}
    </div>
  );
}
