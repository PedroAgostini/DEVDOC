"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  FilePlus2,
  Files,
  LayoutGrid,
  LogOut,
  Menu,
  PencilLine,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Trash2,
  Upload,
} from "lucide-react";
import { signOut } from "@/app/actions/admin";
import { initials } from "@/lib/format";
import { LEVEL_LABEL, type Category, type Department, type Level, type Operation } from "@/lib/types";
import { CommandPalette } from "./CommandPalette";
import { DevCredit } from "./DevCredit";
import { NewDocChooser } from "./NewDocChooser";
import { ThemeToggle } from "./ThemeToggle";

/** A rail section that folds; the choice is remembered per browser. */
function NavGroup({
  id,
  label,
  defaultOpen,
  forceOpen,
  children,
}: {
  id: string;
  label: string;
  defaultOpen: boolean;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`devdoc-rail-${id}`);
      if (saved === "1" || saved === "0") setOpen(saved === "1");
    } catch {
      // Storage unavailable: keep the default.
    }
  }, [id]);
  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      localStorage.setItem(`devdoc-rail-${id}`, next ? "1" : "0");
    } catch {
      // Storage unavailable: the choice lasts for this visit.
    }
  }

  return (
    <div>
      <button type="button" className="nav-group nav-group-toggle" aria-expanded={open} aria-controls={`rail-${id}`} onClick={toggle}>
        {label}
        <ChevronDown size={15} aria-hidden="true" style={{ transform: open ? "none" : "rotate(-90deg)", transition: "transform .2s" }} />
      </button>
      <div id={`rail-${id}`} hidden={!open}>
        {children}
      </div>
    </div>
  );
}

interface Props {
  me: { full_name: string; email: string; level: Level; avatar_url: string | null };
  operations: (Operation & { count: number })[];
  departments: (Department & { count: number })[];
  categories: Category[];
  counts: { total: number; favorites: number; drafts: number };
  canAdmin: boolean;
  canSeeMetrics: boolean;
  children: React.ReactNode;
}

export function Shell({ me, operations, departments, categories, counts, canAdmin, canSeeMetrics, children }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeDep = pathname === "/documentos" ? params.get("departamento") : null;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setRailOpen(false), [pathname]);

  const is = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
  const current = (href: string) => (is(href) ? ("page" as const) : undefined);

  return (
    <div className="shell">
      {railOpen && <div className="scrim" onClick={() => setRailOpen(false)} aria-hidden="true" />}
      <nav className="glass rail" data-open={railOpen} aria-label="Navegação principal">
        <Link href="/" className="wordmark" aria-label="DEVDOC, painel geral">
          <span className="wordmark-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          devdoc
        </Link>
        <div className="rail-scroll">
          <Link href="/" className="nav-link" aria-current={current("/")}>
            <LayoutGrid size={18} /> Painel geral
          </Link>
          <Link href="/documentos" className="nav-link" aria-current={!activeDep ? current("/documentos") : undefined}>
            <Files size={18} /> Documentos <span className="nav-count">{counts.total}</span>
          </Link>
          <Link href="/favoritos" className="nav-link" aria-current={current("/favoritos")}>
            <Star size={18} /> Favoritos <span className="nav-count">{counts.favorites}</span>
          </Link>
          <Link href="/rascunhos" className="nav-link" aria-current={current("/rascunhos")}>
            <PencilLine size={18} /> Rascunhos <span className="nav-count">{counts.drafts}</span>
          </Link>
          <Link href="/importar" className="nav-link" aria-current={current("/importar")}>
            <Upload size={18} /> Importar
          </Link>
          <Link href="/lixeira" className="nav-link" aria-current={current("/lixeira")}>
            <Trash2 size={18} /> Lixeira
          </Link>
          {canSeeMetrics && (
            <Link href="/metricas" className="nav-link" aria-current={current("/metricas")}>
              <BarChart3 size={18} /> Métricas
            </Link>
          )}

          <Link href="/privacidade" className="nav-link" aria-current={current("/privacidade")}>
            <ShieldCheck size={18} /> Privacidade e meus dados
          </Link>

          <NavGroup id="operacoes" label="Operações" defaultOpen forceOpen={pathname.startsWith("/operacoes/")}>
            {operations.map((o) => (
              <Link
                key={o.id}
                href={`/operacoes/${o.slug}`}
                className="nav-link"
                aria-current={current(`/operacoes/${o.slug}`)}
              >
                <span className="op-swatch" style={{ "--c": o.color } as React.CSSProperties} aria-hidden="true" />
                {o.name}
                <span className="nav-count">{o.count}</span>
              </Link>
            ))}
          </NavGroup>

          <NavGroup id="departamentos" label="Departamentos" defaultOpen={false} forceOpen={!!activeDep}>
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/documentos?departamento=${d.slug}`}
                className="nav-link"
                aria-current={activeDep === d.slug ? "page" : undefined}
              >
                <span className="op-swatch" style={{ "--c": d.color, height: 16 } as React.CSSProperties} aria-hidden="true" />
                {d.name}
                <span className="nav-count">{d.count}</span>
              </Link>
            ))}
          </NavGroup>

        </div>

        <div className="rail-foot">
          <Link href="/perfil" className="rail-me" aria-current={current("/perfil")} title="Meu perfil">
            <span className="avatar" style={{ "--c": "var(--ink)", color: "var(--ground)" } as React.CSSProperties} aria-hidden="true">
              {me.avatar_url ? <img src={me.avatar_url} alt="" /> : initials(me.full_name || me.email)}
            </span>
            <span style={{ minWidth: 0, flex: 1, lineHeight: 1.25 }}>
              <span className="doc-title" style={{ display: "block", fontSize: 14 }}>
                {me.full_name || me.email}
              </span>
              <span className="muted small">{LEVEL_LABEL[me.level]}</span>
            </span>
          </Link>
          {canAdmin && (
            <Link
              href="/admin"
              className="icon-btn"
              aria-label="Administração"
              title="Administração"
              aria-current={current("/admin")}
              style={is("/admin") ? { background: "var(--ink)", color: "var(--ground)" } : undefined}
            >
              <Settings2 size={18} />
            </Link>
          )}
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" className="icon-btn" aria-label="Sair" title="Sair">
              <LogOut size={18} />
            </button>
          </form>
        </div>
        <DevCredit className="dev-credit-rail" />
      </nav>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="mobile-bar">
            <button type="button" className="icon-btn glass" onClick={() => setRailOpen(true)} aria-label="Abrir menu">
              <Menu size={20} />
            </button>
          </div>
          <button type="button" className="glass search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={20} aria-hidden="true" />
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Buscar documentos, prompts e códigos
            </span>
            <span className="kbd hide-mobile">Ctrl K</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-tall"
            aria-label="Novo documento"
            onClick={() => setChooserOpen(true)}
          >
            <FilePlus2 size={19} aria-hidden="true" />
            <span className="hide-mobile" aria-hidden="true">Novo documento</span>
          </button>
        </header>
        <main id="conteudo">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        operations={operations}
        categories={categories}
        onNewDocument={() => setChooserOpen(true)}
      />
      <NewDocChooser open={chooserOpen} onClose={() => setChooserOpen(false)} categories={categories} />
    </div>
  );
}
