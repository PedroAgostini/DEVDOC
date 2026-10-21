import { Importer } from "@/components/Importer";
import { getReference } from "@/lib/data";

export const metadata = { title: "Importar" };

export default async function ImportPage() {
  const ref = await getReference();
  return (
    <div className="stack">
      <section style={{ paddingTop: 8 }}>
        <h1 className="display h1">Importar</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Traga documentos que já existem. Você revisa o que vai entrar antes de importar.
        </p>
      </section>
      <Importer categories={ref.categories} operations={ref.operations} />
    </div>
  );
}
