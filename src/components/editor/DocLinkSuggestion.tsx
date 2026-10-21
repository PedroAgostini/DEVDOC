"use client";

import { Extension, ReactRenderer } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FileText } from "lucide-react";
import { docSuggestions, type QuickResult } from "@/app/actions/documents";

interface MenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const DocMenu = forwardRef<MenuRef, SuggestionProps<QuickResult>>(function DocMenu({ items, command, query }, ref) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        command(items[index]);
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="glass-strong menu" role="listbox" aria-label="Link para documento" style={{ position: "static", width: 340, maxHeight: 360, overflowY: "auto" }}>
      <div className="muted small" style={{ padding: "6px 12px 8px" }}>
        {query ? `Documentos com “${query}”` : "Documentos recentes. Digite para buscar."}
      </div>
      {items.length === 0 && <div className="muted small" style={{ padding: "8px 12px 10px" }}>Nenhum documento encontrado.</div>}
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === index}
          data-selected={i === index}
          className="menu-item"
          onMouseEnter={() => setIndex(i)}
          onMouseDown={(e) => {
            e.preventDefault();
            command(item);
          }}
        >
          <FileText size={16} aria-hidden="true" style={{ flex: "none", color: "var(--ink-3)" }} />
          <span style={{ minWidth: 0, lineHeight: 1.3 }}>
            <span style={{ display: "block", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</span>
            {item.summary && (
              <span className="muted small" style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.summary}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
});

function place(el: HTMLElement, rect?: (() => DOMRect | null) | null) {
  const r = rect?.();
  if (!r) return;
  const below = window.innerHeight - r.bottom > 380;
  el.style.left = `${Math.min(r.left, window.innerWidth - 356)}px`;
  el.style.top = below ? `${r.bottom + 8}px` : "";
  el.style.bottom = below ? "" : `${window.innerHeight - r.top + 8}px`;
}

/** Typing [[ searches documents and inserts a Markdown link to the chosen one. */
export function docLinkSuggestion(currentId: string) {
  return Extension.create({
    name: "docLinkSuggestion",
    addProseMirrorPlugins() {
      return [
        Suggestion<QuickResult>({
          editor: this.editor,
          pluginKey: new PluginKey("docLinkSuggestion"),
          char: "[[",
          allowSpaces: true,
          startOfLine: false,
          items: ({ query }) => docSuggestions(query, currentId),
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                { type: "text", text: props.title, marks: [{ type: "link", attrs: { href: `/d/${props.id}` } }] },
                { type: "text", text: " " },
              ])
              .run();
          },
          render: () => {
            let renderer: ReactRenderer<MenuRef, SuggestionProps<QuickResult>> | null = null;
            let el: HTMLElement | null = null;
            const close = () => {
              el?.remove();
              renderer?.destroy();
              el = null;
              renderer = null;
            };
            return {
              onStart: (props) => {
                renderer = new ReactRenderer(DocMenu, { props, editor: props.editor });
                el = renderer.element as HTMLElement;
                el.style.position = "fixed";
                el.style.zIndex = "90";
                document.body.appendChild(el);
                place(el, props.clientRect);
              },
              onUpdate: (props) => {
                renderer?.updateProps(props);
                if (el) place(el, props.clientRect);
              },
              onKeyDown: (props: SuggestionKeyDownProps) => {
                if (props.event.key === "Escape") {
                  close();
                  return true;
                }
                return renderer?.ref?.onKeyDown(props.event) ?? false;
              },
              onExit: close,
            };
          },
        }),
      ];
    },
  });
}
