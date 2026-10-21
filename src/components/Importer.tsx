"use client";

import Link from "next/link";
import JSZip from "jszip";
import { useState } from "react";
import { CheckCircle2, CircleAlert, FileArchive, FileText, Loader2, TriangleAlert, Upload } from "lucide-react";
import { createImported, planImport, publishDocument, saveDraft, type ImportPlan } from "@/app/actions/documents";
import { uploadImage } from "@/components/editor/upload";
import { imageUrls, parseFrontMatter, titleFromBody } from "@/lib/markdown";
import { VISIBILITY_LABEL, type Category, type Operation } from "@/lib/types";

interface Item {
  key: string;
  file: string;
  body: string;
  plan: ImportPlan;
  images: Map<string, Blob>;
  folder: string;
  state: "ready" | "working" | "done" | "error";
  id?: string;
  error?: string;
}

const MIME: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

function resolvePath(folder: string, ref: string) {
  const parts = (folder ? `${folder}/${ref}` : ref).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
}

export function Importer({ categories, operations }: { categories: Category[]; operations: Operation[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [over, setOver] = useState(false);
  const [reading, setReading] = useState(false);
  const [publish, setPublish] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function prepare(file: string, text: string, images: Map<string, Blob>, folder: string): Promise<Item> {
    const { meta, body } = parseFrontMatter(text);
    const fallback = titleFromBody(body, file.replace(/\.(md|markdown)$/i, "").split("/").pop() ?? "Sem título");
    let content = body;
    if (!meta.titulo) {
      // The first H1 became the title; keep it out of the body.
      content = body.replace(/^\s*#\s+.+\r?\n?/, "");
    }
    const plan = await planImport(meta, fallback);
    return { key: `${file}-${Math.random()}`, file, body: content.trim() + "\n", plan, images, folder, state: "ready" };
  }

  async function read(files: FileList | File[]) {
    setError(null);
    setReading(true);
    const next: Item[] = [];
    try {
      for (const f of Array.from(files)) {
        if (/\.(md|markdown|txt)$/i.test(f.name)) {
          next.push(await prepare(f.name, await f.text(), new Map(), ""));
        } else if (/\.zip$/i.test(f.name)) {
          const zip = await JSZip.loadAsync(f);
          const images = new Map<string, Blob>();
          const docs: { path: string; entry: JSZip.JSZipObject }[] = [];
          zip.forEach((path, entry) => {
            if (entry.dir || path.startsWith("__MACOSX")) return;
            if (/\.(md|markdown)$/i.test(path)) docs.push({ path, entry });
          });
          for (const [path, entry] of Object.entries(zip.files)) {
            const ext = path.split(".").pop()?.toLowerCase() ?? "";
            if (!entry.dir && MIME[ext]) images.set(path, new Blob([await entry.async("arraybuffer")], { type: MIME[ext] }));
          }
          for (const d of docs) {
            const folder = d.path.includes("/") ? d.path.slice(0, d.path.lastIndexOf("/")) : "";
            next.push(await prepare(d.path, await d.entry.async("string"), images, folder));
          }
          if (!docs.length) setError(`${f.name} não tem nenhum arquivo .md.`);
        } else {
          setError(`${f.name} não é .md nem .zip.`);
        }
      }
    } catch (e) {
      setError(`Não foi possível ler os arquivos: ${(e as Error).message}`);
    }
    setItems((prev) => [...prev, ...next]);
    setReading(false);
  }

  function patch(key: string, p: Partial<Item>) {
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));
  }

  async function run() {
    setRunning(true);
    for (const item of items) {
      if (item.state === "done") continue;
      patch(item.key, { state: "working", error: undefined });
      try {
        const created = await createImported(item.plan, item.body);
        if (!created.ok) throw new Error(created.error);
        const id = created.data!.id;
        let body = item.body;
        let changed = false;
        for (const ref of imageUrls(body)) {
          if (/^(https?:|data:|\/)/i.test(ref)) continue;
          const path = resolvePath(item.folder, decodeURI(ref));
          const blob = item.images.get(path);
          if (!blob) continue;
          const url = await uploadImage(id, blob, path.split("/").pop());
          body = body.replaceAll(`](${ref})`, `](${url})`).replaceAll(`](<${ref}>)`, `](${url})`);
          changed = true;
        }
        if (changed) {
          const saved = await saveDraft(id, { title: item.plan.title, summary: item.plan.summary, md: body });
          if (!saved.ok) throw new Error(saved.error);
        }
        if (publish) {
          const pub = await publishDocument(id);
          if (!pub.ok) throw new Error(pub.error);
        }
        patch(item.key, { state: "done", id });
      } catch (e) {
        patch(item.key, { state: "error", error: (e as Error).message });
      }
    }
    setRunning(false);
  }

  const pending = items.filter((i) => i.state !== "done").length;

  return (
    <div className="stack">
      <section
        className="glass dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          read(e.dataTransfer.files);
        }}
      >
        <Upload size={30} aria-hidden="true" style={{ color: "var(--action)", margin: "0 auto" }} />
        <h2 className="h2" style={{ marginTop: 14 }}>Arraste arquivos .md ou .zip para cá</h2>
        <p className="muted" style={{ marginTop: 8, maxWidth: "52ch", marginInline: "auto" }}>
          Um .zip pode trazer vários documentos e a pasta de imagens. O cabeçalho do arquivo define categoria, operação,
          departamento, clientes, tags e quem pode ver.
        </p>
        <label className="btn btn-glass" style={{ marginTop: 20 }}>
          {reading ? <Loader2 size={17} className="spin" /> : <FileText size={17} />}
          Escolher arquivos
          <input
            type="file"
            accept=".md,.markdown,.txt,.zip"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) read(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {error && <p className="notice notice-danger" role="alert">{error}</p>}

      {items.length > 0 && (
        <section className="glass panel-flush">
          <div className="panel-head" style={{ flexWrap: "wrap" }}>
            <h2 className="h2">{items.length === 1 ? "1 documento" : `${items.length} documentos`}</h2>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} style={{ accentColor: "var(--action)", width: 16, height: 16 }} />
                Publicar ao importar
              </label>
              <button type="button" className="btn btn-primary btn-sm" onClick={run} disabled={running || pending === 0}>
                {running ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                {pending === 0 ? "Tudo importado" : `Importar ${pending}`}
              </button>
            </div>
          </div>
          <div className="doc-list">
            {items.map((i) => {
              const cat = categories.find((c) => c.id === i.plan.category_id);
              const op = operations.find((o) => o.id === i.plan.operation_id);
              const imgs = imageUrls(i.body).filter((u) => !/^(https?:|data:|\/)/i.test(u)).length;
              return (
                <div key={i.key} className="doc-row" style={{ alignItems: "flex-start" }}>
                  <span className="pane" style={{ "--c": cat?.color ?? "#56667f" } as React.CSSProperties} aria-hidden="true">
                    {i.file.endsWith(".zip") ? <FileArchive size={16} /> : <FileText size={16} />}
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span className="doc-title" style={{ display: "block" }}>{i.plan.title || "Sem título"}</span>
                    <span className="doc-summary" style={{ display: "block" }}>{i.file}</span>
                    <span className="doc-tags">
                      <span className="pill" style={{ "--c": cat?.color } as React.CSSProperties}>{cat?.name ?? "Sem categoria"}</span>
                      <span className="pill pill-dot" style={{ "--c": op?.color ?? "#56667f" } as React.CSSProperties}>{op?.name ?? "Conteúdo geral"}</span>
                      <span className="pill pill-outline">{VISIBILITY_LABEL[i.plan.visibility]}</span>
                      {imgs > 0 && <span className="pill pill-outline">{imgs === 1 ? "1 imagem" : `${imgs} imagens`}</span>}
                    </span>
                    {i.plan.warnings.map((w) => (
                      <span key={w} className="small" style={{ display: "flex", gap: 6, marginTop: 8, color: "var(--ink-2)" }}>
                        <TriangleAlert size={14} style={{ flex: "none", marginTop: 3 }} /> {w}
                      </span>
                    ))}
                    {i.error && (
                      <span className="error-text" style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <CircleAlert size={14} style={{ flex: "none", marginTop: 3 }} /> {i.error}
                      </span>
                    )}
                  </span>
                  <span className="doc-meta">
                    {i.state === "working" && <Loader2 size={18} className="spin" aria-label="Importando" />}
                    {i.state === "done" && i.id && (
                      <Link className="link" href={publish ? `/d/${i.id}` : `/d/${i.id}/editar`} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <CheckCircle2 size={16} /> Abrir
                      </Link>
                    )}
                    {i.state === "ready" && (
                      <button type="button" className="btn btn-quiet btn-sm" onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))}>
                        Remover
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="glass panel">
        <h2 className="h2" style={{ fontSize: 18 }}>Formato do cabeçalho</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          Opcional. Sem cabeçalho, o primeiro título vira o nome do documento e ele fica visível para todos.
        </p>
        <div className="code-block" style={{ marginTop: 14 }}>
          <div className="code-head"><span>YAML no topo do .md</span></div>
          <pre><code>{`---
titulo: Deploy na Vercel com Supabase
resumo: Do repositório ao domínio, com chaves por ambiente
categoria: Documentação
operacao: INOVAÇÃO
departamento: Web
clientes: [Cliente A, Cliente B]
tags: [deploy, vercel]
visibilidade: todos        # todos, nivel, grupos, pessoas, privado
nivel_minimo: Gestor       # quando visibilidade for nivel
grupos: [TS01]             # quando for grupos
pessoas: [ana@empresa.com] # quando for pessoas
---`}</code></pre>
        </div>
      </section>
    </div>
  );
}
