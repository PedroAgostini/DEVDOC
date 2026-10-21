import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import type { Level, Visibility } from "./types";

/** Metadata carried in the front matter so a reimport keeps everything. */
export interface DocMeta {
  titulo?: string;
  resumo?: string;
  categoria?: string;
  operacao?: string;
  departamento?: string;
  clientes?: string[];
  tags?: string[];
  visibilidade?: string;
  nivel_minimo?: string;
  grupos?: string[];
  pessoas?: string[];
  versao?: number;
  atualizado_em?: string;
}

export const VISIBILITY_TO_FILE: Record<Visibility, string> = {
  all: "todos",
  level: "nivel",
  groups: "grupos",
  people: "pessoas",
  private: "privado",
};

const FILE_TO_VISIBILITY: Record<string, Visibility> = {
  todos: "all",
  publico: "all",
  nivel: "level",
  grupos: "groups",
  pessoas: "people",
  privado: "private",
};

export function visibilityFromFile(v?: string): Visibility {
  return FILE_TO_VISIBILITY[(v ?? "").toLowerCase().trim()] ?? "all";
}

export function levelFromFile(v?: string): Level {
  const s = (v ?? "").toLowerCase().trim();
  if (s.startsWith("gest")) return "gestor";
  if (s === "admin") return "admin";
  if (s === "master") return "master";
  return "operacao";
}

const FRONT = /^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontMatter(text: string): { meta: DocMeta; body: string } {
  const m = text.match(FRONT);
  if (!m) return { meta: {}, body: text };
  let meta: DocMeta = {};
  try {
    const parsed = parseYaml(m[1]);
    if (parsed && typeof parsed === "object") meta = parsed as DocMeta;
  } catch {
    meta = {};
  }
  const list = (v: unknown) =>
    Array.isArray(v) ? v.map(String).filter(Boolean) : typeof v === "string" && v ? [v] : undefined;
  meta.clientes = list(meta.clientes);
  meta.tags = list(meta.tags);
  meta.grupos = list(meta.grupos);
  meta.pessoas = list(meta.pessoas);
  return { meta, body: text.slice(m[0].length) };
}

export function withFrontMatter(meta: DocMeta, body: string) {
  const clean = Object.fromEntries(
    Object.entries(meta).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0)),
  );
  return `---\n${stringifyYaml(clean).trim()}\n---\n\n${body.trimStart()}`;
}

/** First markdown H1 when the file has no title in the front matter. */
export function titleFromBody(body: string, fallback: string) {
  const h = body.match(/^#\s+(.+)$/m);
  return (h?.[1] ?? fallback).trim();
}

const VAR = /\{\{\s*([^{}\n]{1,60}?)\s*\}\}/g;

/** Prompt variables written as {{name}}, in order of first appearance. */
export function extractVariables(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(VAR)) {
    const name = m[1].trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out;
}

export function fillVariables(md: string, values: Record<string, string>) {
  return md.replace(VAR, (whole, name: string) => {
    const v = values[name.trim()];
    return v && v.length ? v : whole;
  });
}

/** Image URLs referenced by markdown image syntax. */
export function imageUrls(md: string): string[] {
  const out = new Set<string>();
  for (const m of md.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.add(m[1]);
  return [...out];
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Headings for the in-page outline. Ids match the reader's heading ids. */
export function outline(md: string) {
  const items: { depth: number; text: string; id: string }[] = [];
  let inFence = false;
  for (const line of md.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (m) {
      const text = m[2].replace(/[*_`]/g, "");
      items.push({ depth: m[1].length, text, id: slugify(text) });
    }
  }
  return items;
}
