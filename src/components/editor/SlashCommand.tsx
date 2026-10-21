"use client";

import { Extension, ReactRenderer, type Editor, type Range } from "@tiptap/react";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Braces,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Table,
  type LucideIcon,
} from "lucide-react";

export interface BlockItem {
  title: string;
  hint: string;
  icon: LucideIcon;
  keywords: string;
  run: (editor: Editor, range?: Range) => void;
}

const chain = (editor: Editor, range?: Range) => (range ? editor.chain().focus().deleteRange(range) : editor.chain().focus());

/** Blocks offered by the "/" menu and the toolbar's insert button. */
export const BLOCKS: BlockItem[] = [
  { title: "Texto", hint: "Parágrafo comum", icon: Pilcrow, keywords: "texto paragrafo", run: (e, r) => chain(e, r).setParagraph().run() },
  { title: "Título grande", hint: "Seção principal", icon: Heading1, keywords: "titulo h1 heading", run: (e, r) => chain(e, r).setHeading({ level: 1 }).run() },
  { title: "Título médio", hint: "Subseção", icon: Heading2, keywords: "titulo h2 subtitulo", run: (e, r) => chain(e, r).setHeading({ level: 2 }).run() },
  { title: "Título pequeno", hint: "Detalhe dentro da seção", icon: Heading3, keywords: "titulo h3", run: (e, r) => chain(e, r).setHeading({ level: 3 }).run() },
  { title: "Lista", hint: "Itens com marcador", icon: List, keywords: "lista bullet marcador", run: (e, r) => chain(e, r).toggleBulletList().run() },
  { title: "Lista numerada", hint: "Passo a passo", icon: ListOrdered, keywords: "lista numerada passos ordenada", run: (e, r) => chain(e, r).toggleOrderedList().run() },
  { title: "Checklist", hint: "Tarefas para marcar", icon: ListChecks, keywords: "checklist tarefas todo", run: (e, r) => chain(e, r).toggleTaskList().run() },
  { title: "Bloco de código", hint: "Com destaque e botão copiar", icon: Code2, keywords: "codigo code script", run: (e, r) => chain(e, r).toggleCodeBlock().run() },
  { title: "Variável de prompt", hint: "Campo {{assim}} para preencher", icon: Braces, keywords: "variavel prompt campo", run: (e, r) => chain(e, r).insertContent("{{nome}}").run() },
  { title: "Link para documento", hint: "Busca e liga outro documento (ou digite [[)", icon: Link2, keywords: "link documento referencia ligar mencionar", run: (e, r) => chain(e, r).insertContent("[[").run() },
  { title: "Imagem", hint: "Enviar do computador", icon: ImagePlus, keywords: "imagem foto print screenshot", run: (e, r) => { chain(e, r).run(); window.dispatchEvent(new CustomEvent("devdoc:pick-image")); } },
  { title: "Tabela", hint: "3 colunas para começar", icon: Table, keywords: "tabela table", run: (e, r) => chain(e, r).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Destaque", hint: "Aviso ou citação", icon: Quote, keywords: "citacao aviso destaque nota quote", run: (e, r) => chain(e, r).toggleBlockquote().run() },
  { title: "Divisória", hint: "Linha separando partes", icon: Minus, keywords: "divisoria linha separador", run: (e, r) => chain(e, r).setHorizontalRule().run() },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface MenuRef {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

const SlashMenu = forwardRef<MenuRef, SuggestionProps<BlockItem>>(function SlashMenu({ items, command }, ref) {
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

  if (!items.length) {
    return (
      <div className="glass-strong menu" style={{ position: "static", padding: "12px 14px" }}>
        <span className="muted small">Nenhum bloco com esse nome</span>
      </div>
    );
  }

  return (
    <div className="glass-strong menu" role="listbox" aria-label="Inserir bloco" style={{ position: "static", width: 300, maxHeight: 360, overflowY: "auto" }}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
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
            <span className="pane" style={{ "--c": "var(--op)", width: 30, height: 30, borderRadius: 9 } as React.CSSProperties}>
              <Icon size={15} />
            </span>
            <span style={{ lineHeight: 1.3 }}>
              <span style={{ display: "block", fontWeight: 600 }}>{item.title}</span>
              <span className="muted small">{item.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
});

function place(el: HTMLElement, rect?: (() => DOMRect | null) | null) {
  const r = rect?.();
  if (!r) return;
  const below = window.innerHeight - r.bottom > 380;
  el.style.left = `${Math.min(r.left, window.innerWidth - 316)}px`;
  el.style.top = below ? `${r.bottom + 8}px` : "";
  el.style.bottom = below ? "" : `${window.innerHeight - r.top + 8}px`;
}

export const SlashCommand = Extension.create({
  name: "slashCommand",
  addProseMirrorPlugins() {
    return [
      Suggestion<BlockItem>({
        editor: this.editor,
        pluginKey: new PluginKey("slashCommand"),
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        items: ({ query }) => BLOCKS.filter((b) => norm(`${b.title} ${b.keywords}`).includes(norm(query))).slice(0, 14),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<MenuRef, SuggestionProps<BlockItem>> | null = null;
          let el: HTMLElement | null = null;
          const close = () => {
            el?.remove();
            renderer?.destroy();
            el = null;
            renderer = null;
          };
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenu, { props, editor: props.editor });
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
