"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { trackCopy } from "@/app/actions/documents";

const NAMES: Record<string, string> = {
  ts: "TypeScript", typescript: "TypeScript", tsx: "TSX", js: "JavaScript", javascript: "JavaScript",
  jsx: "JSX", py: "Python", python: "Python", sql: "SQL", bash: "Bash", sh: "Shell", shell: "Shell",
  powershell: "PowerShell", ps1: "PowerShell", json: "JSON", yaml: "YAML", yml: "YAML", html: "HTML",
  xml: "HTML", css: "CSS", scss: "SCSS", php: "PHP", java: "Java", csharp: "C#", cs: "C#", go: "Go",
  rust: "Rust", markdown: "Markdown", md: "Markdown", plaintext: "Texto", text: "Texto",
};

/** Reports a copy for the document that contains this element (marked with data-doc-id). */
export function trackCopyFrom(el: Element) {
  const id = el.closest<HTMLElement>("[data-doc-id]")?.dataset.docId;
  if (id) trackCopy(id).catch(() => undefined);
}

export function languageName(lang?: string | null) {
  if (!lang) return "Texto";
  return NAMES[lang.toLowerCase()] ?? lang;
}

export function CodeBlock({ language, text, children }: { language?: string; text: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent<HTMLButtonElement>) {
    try {
      await navigator.clipboard.writeText(text);
      trackCopyFrom(e.currentTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{languageName(language)}</span>
        <button type="button" className="btn btn-sm" onClick={copy} aria-live="polite">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}
