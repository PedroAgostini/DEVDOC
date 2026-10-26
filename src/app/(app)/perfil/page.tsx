import { getReference, getSupabase, requireMe } from "@/lib/data";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const me = await requireMe();
  const supabase = await getSupabase();
  const [ref, ops, deps] = await Promise.all([
    getReference(),
    supabase.from("member_operations").select("operation_id").eq("member_id", me.id),
    supabase.from("member_departments").select("department_id").eq("member_id", me.id),
  ]);
  const opIds = new Set((ops.data ?? []).map((r) => r.operation_id));
  const depIds = new Set((deps.data ?? []).map((r) => r.department_id));

  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Meu perfil</h1>
        <p className="lede" style={{ marginTop: 10 }}>Sua foto e sua senha. O resto do cadastro fica com a administração.</p>
      </section>
      <ProfileForm
        me={{ id: me.id, full_name: me.full_name, email: me.email, level: me.level, avatar_url: me.avatar_url }}
        groups={[
          ...ref.operations.filter((o) => opIds.has(o.id)).map((o) => ({ name: o.name, color: o.color, kind: "Operação" })),
          ...ref.departments.filter((d) => depIds.has(d.id)).map((d) => ({ name: d.name, color: d.color, kind: "Departamento" })),
        ]}
      />
    </div>
  );
}
