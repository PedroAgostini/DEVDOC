"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, CircleAlert, CircleDot, Eye, FileCode2, Loader2, Send, Type, Undo } from "lucide-react";
import { discardDraft, publishDocument, saveDraft, updateMeta } from "@/app/actions/documents";
import { SetLight } from "@/components/SetLight";
import { relative } from "@/lib/format";
import type { Member, Reference } from "@/lib/types";
import { editorExtensions } from "./extensions";
import { MetaPanel, type MetaState } from "./MetaPanel";
import { Toolbar } from "./Toolbar";
import { imageFiles, uploadImage } from "./upload";

interface Props {
  id: string;
  initial: { title: string; summary: string; md: string };
  meta: MetaState;
  status: "draft" | "published";
  hasUnpublished: boolean;
  savedAt: string | null;
  reference: Reference;
  members: Member[];
  authorId: string;
  canChangeAccess: boolean;
  knownTags: string[];
}

type SaveState = "saved" | "dirty" | "saving" | "error";

export function DocEditor(props: Props) {
  const { id, reference, members, authorId, canChangeAccess, knownTags, status } = props;
  const router = useRouter();
  const [title, setTitle] = useState(props.initial.title);
  const [summary, setSummary] = useState(props.initial.summary);
  const [meta, setMeta] = useState<MetaState>(props.meta);
  const [mode, setMode] = useState<"visual" | "markdown">("visual");
  const [raw, setRaw] = useState(props.initial.md);
  const [save, setSave] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<string | null>(props.savedAt);
  const [unpublished, setUnpublished] = useState(props.hasUnpublished);
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [publishing, startPublish] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, summary, md: props.initial.md });
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), error ? 5200 : 2600);
  }, []);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setSave("saving");
    const r = await saveDraft(id, latest.current);
    if (r.ok) {
      setSave("saved");
      setSavedAt(r.data!.at);
      setUnpublished(true);
      return true;
    }
    setSave("error");
    notify(r.error, true);
    return false;
  }, [id, notify]);

  const schedule = useCallback(() => {
    setSave("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1100);
  }, [flush]);

  const insertImages = useCallback(
    async (files: File[], at?: number) => {
      if (!files.length) return;
      setUploading((n) => n + files.length);
      for (const file of files) {
        try {
          const src = await uploadImage(id, file, file.name);
          const chain = editorRef.current?.chain().focus();
          if (at !== undefined) chain?.insertContentAt(at, { type: "image", attrs: { src, alt: file.name.replace(/\.[^.]+$/, "") } }).run();
          else chain?.setImage({ src, alt: file.name.replace(/\.[^.]+$/, "") }).run();
        } catch (e) {
          notify((e as Error).message, true);
        } finally {
          setUploading((n) => n - 1);
        }
      }
    },
    [id, notify],
  );

  const editorRef = useRef<ReturnType<typeof useEditor>>(null);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions(id),
    content: props.initial.md,
    contentType: "markdown",
    editorProps: {
      attributes: { class: "prose", "aria-label": "Conteúdo do documento" },
      handlePaste: (_view, event) => {
        const files = imageFiles(event.clipboardData?.files);
        if (!files.length) return false;
        event.preventDefault();
        insertImages(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = imageFiles((event as DragEvent).dataTransfer?.files);
        if (!files.length) return false;
        event.preventDefault();
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        insertImages(files, pos);
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (modeRef.current !== "visual") return;
      latest.current.md = e.getMarkdown();
      schedule();
    },
  });
  editorRef.current = editor;

  useEffect(() => {
    const pick = () => fileInput.current?.click();
    window.addEventListener("devdoc:pick-image", pick);
    return () => window.removeEventListener("devdoc:pick-image", pick);
  }, []);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (save === "dirty" || save === "saving" || uploading > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [save, uploading]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        flush();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  function switchMode(next: "visual" | "markdown") {
    if (next === mode || !editor) return;
    if (next === "markdown") {
      setRaw(editor.getMarkdown());
    } else {
      editor.commands.setContent(raw, { contentType: "markdown", emitUpdate: false });
      latest.current.md = editor.getMarkdown();
    }
    setMode(next);
  }

  async function changeMeta(patch: Partial<MetaState>) {
    const prev = meta;
    // Choosing a category on an empty document brings its template and review cadence.
    if (patch.category_id) {
      const cat = reference.categories.find((c) => c.id === patch.category_id);
      const empty = mode === "visual" ? !!editor?.isEmpty : !raw.trim();
      if (cat?.template_md.trim() && empty) {
        if (mode === "visual") editor?.commands.setContent(cat.template_md, { contentType: "markdown" });
        else {
          setRaw(cat.template_md);
          latest.current.md = cat.template_md;
          schedule();
        }
        notify(`Modelo de ${cat.name} aplicado.`);
      }
      if (cat?.review_months && meta.review_interval_months == null) {
        patch = { ...patch, review_interval_months: cat.review_months };
      }
    }
    setMeta({ ...meta, ...patch });
    const r = await updateMeta(id, patch);
    if (!r.ok) {
      setMeta(prev);
      notify(r.error, true);
    }
  }

  function publish() {
    startPublish(async () => {
      if (!latest.current.title.trim()) {
        notify("Dê um título antes de publicar.", true);
        return;
      }
      const okSave = await flush();
      if (!okSave) return;
      const r = await publishDocument(id);
      if (!r.ok) {
        notify(r.error, true);
        return;
      }
      router.push(`/d/${id}`);
      router.refresh();
    });
  }

  async function discard() {
    const r = await discardDraft(id);
    if (!r.ok) return notify(r.error, true);
    router.push(`/d/${id}`);
    router.refresh();
  }

  const op = reference.operations.find((o) => o.id === meta.operation_id);
  const statusLabel = {
    saved: savedAt ? `Salvo ${relative(savedAt)}` : "Nada para salvar",
    dirty: "Alterações não salvas",
    saving: "Salvando",
    error: "Não foi salvo",
  }[save];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <SetLight color={op?.color} />
      <div
        className="glass"
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 8px 10px", borderRadius: 20, flexWrap: "wrap" }}
      >
        <Link href={status === "published" ? `/d/${id}` : "/rascunhos"} className="btn btn-quiet btn-sm">
          <ArrowLeft size={16} /> {status === "published" ? "Ver publicado" : "Rascunhos"}
        </Link>
        <span
          className="small"
          role="status"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: save === "error" ? "var(--danger)" : "var(--ink-3)" }}
        >
          {save === "saving" ? (
            <Loader2 size={15} className="spin" />
          ) : save === "error" ? (
            <CircleAlert size={15} />
          ) : save === "dirty" ? (
            <CircleDot size={15} />
          ) : (
            <Check size={15} />
          )}
          {statusLabel}
          {uploading > 0 && ` · enviando ${uploading} ${uploading === 1 ? "imagem" : "imagens"}`}
        </span>
        <span style={{ flex: 1 }} />
        <div className="tabs" role="tablist" aria-label="Modo de edição" style={{ padding: 3, background: "color-mix(in oklab, var(--ink) 6%, transparent)", borderRadius: 14 }}>
          <button type="button" role="tab" aria-selected={mode === "visual"} aria-current={mode === "visual" ? "page" : undefined} className="tab" style={{ padding: "6px 12px" }} onClick={() => switchMode("visual")}>
            <Type size={15} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />Visual
          </button>
          <button type="button" role="tab" aria-selected={mode === "markdown"} aria-current={mode === "markdown" ? "page" : undefined} className="tab" style={{ padding: "6px 12px" }} onClick={() => switchMode("markdown")}>
            <FileCode2 size={15} style={{ display: "inline", verticalAlign: -2, marginRight: 6 }} />Markdown
          </button>
        </div>
        {status === "published" && unpublished && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={discard} title="Volta ao conteúdo publicado">
            <Undo size={16} /> Descartar alterações
          </button>
        )}
        <a href={`/imprimir/${id}`} target="_blank" rel="noopener" className="btn btn-quiet btn-sm" title="Ver como vai ficar">
          <Eye size={16} /> <span className="hide-mobile">Prévia</span>
        </a>
        <button type="button" className="btn btn-primary" onClick={publish} disabled={publishing}>
          {publishing ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
          {status === "published" ? "Publicar alterações" : "Publicar"}
        </button>
      </div>

      <div className="dash">
        <article className="glass panel" style={{ padding: "clamp(20px, 3.5vw, 44px)", minWidth: 0 }}>
          <label className="sr-only" htmlFor="doc-title">Título</label>
          <textarea
            id="doc-title"
            className="title-input"
            rows={1}
            placeholder="Título do documento"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              latest.current.title = e.target.value;
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
              schedule();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                document.getElementById("doc-summary")?.focus();
              }
            }}
          />
          <label className="sr-only" htmlFor="doc-summary">Resumo</label>
          <input
            id="doc-summary"
            className="summary-input"
            placeholder="Resumo em uma linha: aparece nas listas e na busca"
            value={summary}
            maxLength={220}
            onChange={(e) => {
              setSummary(e.target.value);
              latest.current.summary = e.target.value;
              schedule();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                editor?.commands.focus("start");
              }
            }}
            style={{ marginTop: 10 }}
          />

          <div style={{ position: "sticky", top: 90, zIndex: 15, margin: "24px 0 22px" }}>
            {mode === "visual" && editor ? (
              <Toolbar editor={editor} onPickImage={() => fileInput.current?.click()} />
            ) : (
              <p className="notice" style={{ fontSize: 13.5 }}>
                Você está editando o markdown puro. Volte para Visual para usar a barra de ferramentas.
              </p>
            )}
          </div>

          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            hidden
            onChange={(e) => {
              insertImages(imageFiles(e.target.files));
              e.target.value = "";
            }}
          />

          {mode === "visual" ? (
            <EditorContent editor={editor} />
          ) : (
            <textarea
              className="raw-editor"
              aria-label="Markdown"
              value={raw}
              spellCheck={false}
              onChange={(e) => {
                setRaw(e.target.value);
                latest.current.md = e.target.value;
                schedule();
              }}
            />
          )}
        </article>

        <aside style={{ position: "sticky", top: 96 }}>
          <MetaPanel
            meta={meta}
            onChange={changeMeta}
            reference={reference}
            members={members}
            authorId={authorId}
            canChangeAccess={canChangeAccess}
            knownTags={knownTags}
          />
          <p className="hint" style={{ padding: "14px 6px 0" }}>
            {status === "draft"
              ? "Rascunho: só você vê até publicar. Tudo é salvo sozinho enquanto você escreve."
              : "As alterações ficam guardadas como rascunho e só aparecem para os outros quando você publicar."}
          </p>
        </aside>
      </div>

      {toast && (
        <div className="glass-strong toast" role={toast.error ? "alert" : "status"} style={{ color: toast.error ? "var(--danger)" : "var(--ink)" }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
