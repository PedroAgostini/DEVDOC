import { redirect } from "next/navigation";
import { Shell } from "@/components/Shell";
import { draftCount, favoriteCount, getCounts, getMe, getReference, getSupabase } from "@/lib/data";
import { LEVEL_RANK } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  if (!me) {
    // Signed in at the auth level but without an active DEVDOC registration.
    const supabase = await getSupabase();
    await supabase.auth.signOut();
    redirect("/login?erro=sem-acesso");
  }

  const [ref, counts, drafts, favorites] = await Promise.all([
    getReference(),
    getCounts(),
    draftCount(me.id),
    favoriteCount(me.id),
  ]);

  return (
    <Shell
      me={me}
      operations={ref.operations.map((o) => ({ ...o, count: counts.byOperation.get(o.id) ?? 0 }))}
      departments={ref.departments.map((d) => ({ ...d, count: counts.byDepartment.get(d.id) ?? 0 }))}
      categories={ref.categories}
      counts={{ total: counts.total, favorites, drafts }}
      canAdmin={LEVEL_RANK[me.level] >= LEVEL_RANK.admin}
      canSeeMetrics={LEVEL_RANK[me.level] >= LEVEL_RANK.gestor}
    >
      {children}
    </Shell>
  );
}
