"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { useState } from "react";
import {
  Bold,
  Braces,
  Code,
  Code2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table,
  Undo2,
  type LucideIcon,
} from "lucide-react";

interface Props {
  editor: Editor;
  onPickImage: () => void;
}

function Tool({
  icon: Icon,
  label,
  shortcut,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const title = shortcut ? `${label} (${shortcut})` : label;
  return (
    <button
      type="button"
      className="icon-btn"
      style={{ width: 32, height: 34, borderRadius: 10 }}
      aria-label={title}
      title={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  );
}

export function Toolbar({ editor, onPickImage }: Props) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");

  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      block: e.isActive("heading", { level: 1 })
        ? "h1"
        : e.isActive("heading", { level: 2 })
          ? "h2"
          : e.isActive("heading", { level: 3 })
            ? "h3"
            : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      code: e.isActive("code"),
      link: e.isActive("link"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      task: e.isActive("taskList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const c = () => editor.chain().focus();

  function setBlock(v: string) {
    if (v === "p") c().setParagraph().run();
    else c().setHeading({ level: Number(v[1]) as 1 | 2 | 3 }).run();
  }

  function applyLink() {
    const url = href.trim();
    if (!url) c().extendMarkRange("link").unsetLink().run();
    else c().extendMarkRange("link").setLink({ href: /^https?:\/\/|^\/|^mailto:/.test(url) ? url : `https://${url}` }).run();
    setLinkOpen(false);
  }

  return (
    <div>
      <div className="glass toolbar" role="toolbar" aria-label="Formatação">
        <label>
          <span className="sr-only">Tipo de texto</span>
          <select
            className="select"
            style={{ minHeight: 34, width: 128, padding: "4px 28px 4px 10px", borderRadius: 10, fontSize: 14, backgroundPosition: "right 8px center" }}
            value={s.block}
            onChange={(e) => setBlock(e.target.value)}
          >
            <option value="p">Texto</option>
            <option value="h1">Título grande</option>
            <option value="h2">Título médio</option>
            <option value="h3">Título pequeno</option>
          </select>
        </label>
        <span className="toolbar-sep" />
        <Tool icon={Bold} label="Negrito" shortcut="Ctrl+B" active={s.bold} onClick={() => c().toggleBold().run()} />
        <Tool icon={Italic} label="Itálico" shortcut="Ctrl+I" active={s.italic} onClick={() => c().toggleItalic().run()} />
        <Tool icon={Strikethrough} label="Riscado" active={s.strike} onClick={() => c().toggleStrike().run()} />
        <Tool icon={Code} label="Código na linha" shortcut="Ctrl+E" active={s.code} onClick={() => c().toggleCode().run()} />
        <Tool
          icon={Link2}
          label="Link"
          shortcut="Ctrl+K"
          active={s.link || linkOpen}
          onClick={() => {
            setHref((editor.getAttributes("link").href as string) ?? "");
            setLinkOpen((v) => !v);
          }}
        />
        <span className="toolbar-sep" />
        <Tool icon={List} label="Lista" active={s.bullet} onClick={() => c().toggleBulletList().run()} />
        <Tool icon={ListOrdered} label="Lista numerada" active={s.ordered} onClick={() => c().toggleOrderedList().run()} />
        <Tool icon={ListChecks} label="Checklist" active={s.task} onClick={() => c().toggleTaskList().run()} />
        <Tool icon={Quote} label="Destaque ou citação" active={s.quote} onClick={() => c().toggleBlockquote().run()} />
        <span className="toolbar-sep" />
        <Tool icon={Code2} label="Bloco de código" active={s.codeBlock} onClick={() => c().toggleCodeBlock().run()} />
        <Tool icon={Braces} label="Variável de prompt {{nome}}" onClick={() => c().insertContent("{{nome}}").run()} />
        <Tool icon={ImagePlus} label="Imagem (ou cole com Ctrl+V)" onClick={onPickImage} />
        <Tool icon={Table} label="Tabela" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} />
        <Tool icon={Minus} label="Divisória" onClick={() => c().setHorizontalRule().run()} />
        <span className="toolbar-sep" />
        <Tool icon={Undo2} label="Desfazer" shortcut="Ctrl+Z" disabled={!s.canUndo} onClick={() => c().undo().run()} />
        <Tool icon={Redo2} label="Refazer" shortcut="Ctrl+Shift+Z" disabled={!s.canRedo} onClick={() => c().redo().run()} />
      </div>
      {linkOpen && (
        <form
          className="glass-strong"
          style={{ display: "flex", gap: 8, padding: 8, marginTop: 8, borderRadius: 16 }}
          onSubmit={(e) => {
            e.preventDefault();
            applyLink();
          }}
        >
          <label className="sr-only" htmlFor="link-url">Endereço do link</label>
          <input
            id="link-url"
            autoFocus
            className="field"
            placeholder="Cole o endereço, por exemplo https://..."
            value={href}
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setLinkOpen(false)}
          />
          <button type="submit" className="btn btn-primary btn-sm">Aplicar</button>
          {s.link && (
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setHref(""); c().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); }}>
              Remover
            </button>
          )}
        </form>
      )}
    </div>
  );
}
