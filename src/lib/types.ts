export type Level = "operacao" | "gestor" | "admin" | "master";
export type Visibility = "all" | "level" | "groups" | "people" | "private";
export type DocStatus = "draft" | "published";

export const LEVELS: Level[] = ["operacao", "gestor", "admin", "master"];

export const LEVEL_LABEL: Record<Level, string> = {
  operacao: "Operação",
  gestor: "Gestor",
  admin: "Admin",
  master: "Master",
};

export const LEVEL_RANK: Record<Level, number> = { operacao: 1, gestor: 2, admin: 3, master: 4 };

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  all: "Todos",
  level: "A partir de um nível",
  groups: "Grupos",
  people: "Pessoas específicas",
  private: "Só eu",
};

export interface Member {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  level: Level;
  active: boolean;
  auth_user_id: string | null;
  created_at?: string;
}

export interface Operation {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort: number;
  template_md: string;
  review_months: number | null;
}

export const REVIEW_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: "Não precisa revisar" },
  { value: 3, label: "A cada 3 meses" },
  { value: 6, label: "A cada 6 meses" },
  { value: 12, label: "A cada 12 meses" },
];

export interface Department {
  id: string;
  name: string;
  slug: string;
  color: string;
  sort: number;
}

export interface Client {
  id: string;
  name: string;
  operation_id: string | null;
}

export interface Group {
  id: string;
  name: string;
  operation_id: string | null;
  department_id: string | null;
}

export interface DocSummary {
  id: string;
  title: string;
  summary: string;
  status: DocStatus;
  category_id: string | null;
  operation_id: string | null;
  department_id: string | null;
  author_id: string;
  owner_id: string | null;
  review_interval_months: number | null;
  reviewed_at: string | null;
  review_due_at: string | null;
  visibility: Visibility;
  min_level: Level;
  tags: string[];
  code_languages: string[];
  published_at: string | null;
  updated_at: string;
  draft_title: string | null;
  draft_updated_at: string | null;
  deleted_at: string | null;
  pinned: boolean;
  version: number;
  author?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export interface DocFull extends DocSummary {
  content_md: string;
  draft_summary: string | null;
  draft_md: string | null;
  created_at: string;
}

export interface Reference {
  operations: Operation[];
  departments: Department[];
  categories: Category[];
  clients: Client[];
  groups: Group[];
}

export function displayTitle(d: Pick<DocSummary, "title" | "draft_title">) {
  return (d.draft_title ?? d.title).trim() || "Sem título";
}
