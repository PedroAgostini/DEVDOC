"use client";

import { useId, useMemo, useState } from "react";
import { Check, ClipboardCopy, Copy } from "lucide-react";
import { fillVariables } from "@/lib/markdown";
import { trackCopyFrom } from "./CodeBlock";

/** Fill the {{variables}} of a prompt and copy the result. */
export function PromptFiller({
  source,
  variables,
  bare = false,
}: {
  source: string;
  variables: string[];
  /** Inside another panel: no glass chrome of its own. */
  bare?: boolean;
}) {
  const uid = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"filled" | "raw" | null>(null);
  const missing = variables.filter((v) => !values[v]?.trim()).length;
  const filled = useMemo(() => fillVariables(source, values), [source, values]);

  async function copy(kind: "filled" | "raw", el: Element) {
    try {
      await navigator.clipboard.writeText(kind === "filled" ? filled : source);
      trackCopyFrom(el);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section
      className={bare ? undefined : "glass panel"}
      style={bare ? { borderTop: "1px solid var(--line)", paddingTop: 24 } : undefined}
      aria-labelledby={`${uid}-title`}
    >
      <h2 id={`${uid}-title`} className="h2">Preencher o prompt</h2>
      <p className="muted small tabular" style={{ margin: "4px 0 16px" }}>
        {missing === 0 ? "Tudo preenchido" : `${missing} de ${variables.length} em aberto`}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {variables.map((v) => (
          <div key={v}>
            <label className="label" htmlFor={`${uid}-${v}`} style={{ marginBottom: 6 }}>
              <span className="var-token">{`{{${v}}}`}</span>
            </label>
            {v.length > 0 && (
              <textarea
                id={`${uid}-${v}`}
                className="textarea"
                rows={1}
                style={{ resize: "vertical", minHeight: 44 }}
                value={values[v] ?? ""}
                onChange={(e) => setValues((s) => ({ ...s, [v]: e.target.value }))}
                placeholder={`Valor para ${v}`}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 18 }}>
        <button type="button" className="btn btn-primary" onClick={(e) => copy("filled", e.currentTarget)}>
          {copied === "filled" ? <Check size={17} /> : <ClipboardCopy size={17} />}
          {copied === "filled" ? "Copiado" : "Copiar preenchido"}
        </button>
        <button type="button" className="btn btn-quiet btn-sm" onClick={(e) => copy("raw", e.currentTarget)}>
          {copied === "raw" ? <Check size={16} /> : <Copy size={16} />}
          {copied === "raw" ? "Copiado" : "Copiar com as variáveis em branco"}
        </button>
      </div>
    </section>
  );
}
