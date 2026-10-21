"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintNow() {
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
    const t = setTimeout(() => document.fonts.ready.then(() => window.print()), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="no-print glass" style={{ display: "flex", gap: 16, alignItems: "center", justifyContent: "space-between", padding: "14px 20px", marginBottom: 32, flexWrap: "wrap" }}>
      <span>Na janela de impressão, escolha <strong>Salvar como PDF</strong>.</span>
      <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
        <Printer size={16} /> Abrir impressão
      </button>
    </div>
  );
}
