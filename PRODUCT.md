# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + Supabase (Postgres, Auth, Storage). Deploy: Vercel + Supabase cloud. Development runs Supabase locally via Docker.

## Users

Internal team only, around 100 people. Access is granted by invitation from a Master or Admin. People document processes, store reusable prompts and code, and record how problems were solved, then come back to find and copy that knowledge during daily work.

Levels form a ladder: Operação < Gestor < Admin < Master. More than one Master may exist.

## Product Purpose

DEVDOC is the team's knowledge base in Markdown: documentation, prompts, code and troubleshooting notes, organized by operation and client, with fine-grained visibility. Success means people find the right document in seconds and anyone, including people who do not know Markdown, can write a good one.

## Positioning

A Markdown-native knowledge base built around how this team works: operations, clients and a level ladder decide who sees what, prompts carry fillable variables, and every document round-trips as a plain .md file with its metadata intact.

## Operating Context

- Operations (seeded): TS01, TS02, TS BRASIL, INOVAÇÃO, ADM, DIRETORIA. Each operation is an automatic group; admins can create extra groups.
- A person can belong to several operations. A document belongs to one operation or none (general content), any number of clients, one category and free tags.
- Departments (seeded): Web, Social Media, Tradução, Tráfego Pago, Audiovisual, Design, Gestão Estratégica, Gestão de Projetos, Comercial, Closer, RH, Financeiro, Inovação, CEO. A person can belong to several; each department is an automatic access group; a document may belong to one department, with filter and counts.
- Clients are labels for organization, not users. Each client is served by one operation (optional), shown on that operation's panel.
- Default categories (admin editable): Documentação, Prompt, Código, Resolução de problemas, Processo, Onboarding.
- Heavy use of copy: prompts and code snippets get copied into other tools many times a day.

## Capabilities and Constraints

- Login: Google or email link with password, only for pre-registered emails. Unregistered emails are refused with a clear message.
- Roles: Master does everything Admin does, plus creating and removing Admins and transferring ownership of documents from deactivated people. Admin registers users (Operação and Gestor levels), operations, clients, categories and groups. Gestor edits any document of their own operation, manages its members and pins documents on the operation panel. Operação creates and edits their own documents.
- Read visibility: everyone; from a level upward; specific groups; specific people; only me. Private documents cannot be read by Admin or Master; Master can only transfer ownership of a deactivated person's documents without reading them.
- Edit rights: author, chosen co-editors, Gestor of the document's operation, Admin and Master (except private documents).
- Drafts autosave and are visible only to the author until published. Each publish creates a version; history allows restore. Favorites. Trash keeps deleted documents 30 days (author or Admin restores).
- Editor: visual (Notion-like) with toolbar and slash menu, saves Markdown, toggle to raw Markdown. Images by paste, drag or file picker, 10 MB limit, auto compression, stored in Supabase Storage with the document's permissions.
- Prompts support `{{variables}}` filled in before "copy filled". Code blocks have syntax highlighting, language, copy, multiple blocks per document.
- Import .md and .zip (with images). Export .md, .zip and PDF. Metadata (category, clients, operation, visibility, tags) lives in front matter so reimport keeps it.
- General panel: search and New, continue where you left off, favorites, recently updated, counts by category and operation as filter shortcuts. Operation panel: same scoped, pinned documents on top, member list.
- Global search with Ctrl+K (title, content, tags). Listing filters: category, operation, client, author, tags, code language, visibility, date. Filters live in the URL.
- Mobile: reading, searching and copying are fully supported; the full editor targets desktop, with simple edits on mobile.
- Scale: up to ~100 people and a few thousand documents; Postgres full-text search.
- Interface language: Portuguese (pt-BR).

## Brand Commitments

- Name: DEVDOC.
- Binding visual constraints from the owner: glassmorphism; light and dark modes; light mode on an off-white palette that is easy on the eyes; a beautiful dark mode; rounded corners; no generic colors, no generic fonts, no eyebrow labels, no em dashes in copy, generous spacing.

## Evidence on Hand

No existing content, logos or assets. Do not invent customers, metrics or testimonials.

## Product Principles

1. Finding beats filing: search, filters and panels must surface the right document in seconds.
2. Writing must not require Markdown knowledge, yet Markdown stays the source of truth.
3. Permissions are enforced by the database, never only hidden in the interface; private means private.
4. Copying is a first-class action: prompts and code are one click from the clipboard.
5. Every document leaves and returns as a plain .md file without losing its metadata.
