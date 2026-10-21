"use client";

import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import { languageName } from "@/components/reader/CodeBlock";

export const EDITOR_LANGUAGES = [
  "typescript", "javascript", "tsx", "jsx", "python", "sql", "bash", "powershell", "json", "yaml",
  "html", "css", "scss", "php", "java", "csharp", "go", "rust", "markdown", "plaintext",
];

export function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  const language = (node.attrs.language as string | null) ?? "";
  return (
    <NodeViewWrapper className="code-block" style={{ margin: "1.2em 0" }}>
      <div className="code-head" contentEditable={false}>
        <label>
          <span className="sr-only">Linguagem do código</span>
          <select value={language} onChange={(e) => updateAttributes({ language: e.target.value || null })}>
            <option value="">Detectar linguagem</option>
            {EDITOR_LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {languageName(l)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}
