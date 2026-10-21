import StarterKit from "@tiptap/starter-kit";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem } from "@tiptap/extension-task-item";
import { TaskList } from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { common, createLowlight } from "lowlight";
import { CodeBlockView } from "./CodeBlockView";
import { docLinkSuggestion } from "./DocLinkSuggestion";
import { SlashCommand } from "./SlashCommand";

export const lowlight = createLowlight(common);

export function editorExtensions(docId: string) {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
    }),
    CodeBlockLowlight.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockView);
      },
    }).configure({ lowlight, defaultLanguage: null }),
    Image.configure({ allowBase64: false }),
    Placeholder.configure({
      placeholder: ({ node }) =>
        node.type.name === "heading" ? "Título da seção" : "Escreva aqui, ou digite / para inserir títulos, listas, código e imagens",
    }),
    TableKit.configure({ table: { resizable: false } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Markdown,
    SlashCommand,
    docLinkSuggestion(docId),
  ];
}
