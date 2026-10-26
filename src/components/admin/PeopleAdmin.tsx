"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, Check, MailCheck, Pencil, ShieldOff, Trash2, UserPlus, X } from "lucide-react";
import { deleteMember, inviteMember, resetMfa, transferDocuments, updateMember } from "@/app/actions/admin";
import { MultiPicker } from "@/components/ui/MultiPicker";
import { initials } from "@/lib/format";
import { LEVEL_LABEL, LEVELS, type Department, type Level, type Member, type Operation } from "@/lib/types";

interface Props {
  members: Member[];
  memberOps: { member_id: string; operation_id: string }[];
  memberDeps: { member_id: string; department_id: string }[];
  operations: Operation[];
  departments: Department[];
  myLevel: Level;
  myId: string;
}

const EMPTY_INVITE = { email: "", full_name: "", level: "operacao" as Level, operations: [] as string[], departments: [] as string[] };

export function PeopleAdmin({ members, memberOps, memberDeps, operations, departments, myLevel, myId }: Props) {
  const isMaster = myLevel === "master";
  const allowedLevels = LEVELS.filter((l) => isMaster || l === "operacao" || l === "gestor");
  const opsOf = (id: string) => memberOps.filter((m) => m.member_id === id).map((m) => m.operation_id);
  const depsOf = (id: string) => memberDeps.filter((m) => m.member_id === id).map((m) => m.department_id);
  const opOptions = operations.map((o) => ({ value: o.id, label: o.name }));
  const depOptions = departments.map((d) => ({ value: d.id, label: d.name }));

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [depFilter, setDepFilter] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    full_name: "",
    email: "",
    level: "operacao" as Level,
    operations: [] as string[],
    departments: [] as string[],
    active: true,
  });
  const shown = depFilter
    ? members.filter((m) => (depFilter === "none" ? depsOf(m.id).length === 0 : depsOf(m.id).includes(depFilter)))
    : members;
  const [transferTo, setTransferTo] = useState("");
  const [resetArmed, setResetArmed] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [pending, start] = useTransition();

  function run<T>(fn: () => Promise<{ ok: true; data?: T } | { ok: false; error: string }>, done: (data?: T) => void) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setMessage({ text: r.error, error: true });
      else done(r.data);
    });
  }

  function edit(m: Member) {
    setDeleting(null);
    setEditing(m.id);
    setDraft({ full_name: m.full_name, email: m.email, level: m.level, operations: opsOf(m.id), departments: depsOf(m.id), active: m.active });
    setTransferTo("");
    setMessage(null);
  }

  const canTouch = (m: Member) => m.id !== myId && (isMaster || (m.level !== "admin" && m.level !== "master"));

  return (
    <section className="glass panel">
      <div className="panel-head" style={{ alignItems: "flex-start" }}>
        <div>
          <h2 className="h2">Pessoas</h2>
          <p className="muted small" style={{ marginTop: 4, maxWidth: "62ch" }}>
            Só quem está aqui consegue entrar. {isMaster ? "Como Master, você também cadastra Admins e Masters." : "Admins cadastram pessoas de nível Operação e Gestor."}
          </p>
        </div>
        {!inviteOpen && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} /> Liberar acesso
          </button>
        )}
      </div>

      {message && (
        <p className={`notice ${message.error ? "notice-danger" : ""}`} role={message.error ? "alert" : "status"} style={{ marginBottom: 14 }}>
          {message.text}
        </p>
      )}

      {inviteOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => inviteMember(invite),
              (data) => {
                setMessage({
                  text: data?.emailSent
                    ? `Acesso liberado. Enviamos um convite para ${invite.email}.`
                    : `Acesso liberado para ${invite.email}. A pessoa entra com Google ou pede um link na tela de login.`,
                });
                setInvite(EMPTY_INVITE);
                setInviteOpen(false);
              },
            );
          }}
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, padding: 18, borderRadius: 18, background: "var(--action-soft)", marginBottom: 18 }}
        >
          <div>
            <label className="label" htmlFor="inv-email">E-mail</label>
            <input id="inv-email" className="field" type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="nome@empresa.com.br" />
          </div>
          <div>
            <label className="label" htmlFor="inv-name">Nome</label>
            <input id="inv-name" className="field" value={invite.full_name} onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} placeholder="Como aparece para o time" />
          </div>
          <div>
            <label className="label" htmlFor="inv-level">Nível</label>
            <select id="inv-level" className="select" value={invite.level} onChange={(e) => setInvite({ ...invite, level: e.target.value as Level })}>
              {allowedLevels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
          </div>
          <MultiPicker label="Operações" options={opOptions} value={invite.operations} onChange={(operations) => setInvite({ ...invite, operations })} placeholder="Escolha uma ou mais" />
          <MultiPicker label="Departamentos" options={depOptions} value={invite.departments} onChange={(d) => setInvite({ ...invite, departments: d })} placeholder="Escolha um ou mais" />
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={pending}><MailCheck size={17} /> Liberar e convidar</button>
            <button type="button" className="btn btn-quiet" onClick={() => setInviteOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <label className="sr-only" htmlFor="dep-filter">Filtrar por departamento</label>
        <select id="dep-filter" className="select" style={{ maxWidth: 280 }} value={depFilter} onChange={(e) => setDepFilter(e.target.value)}>
          <option value="">Todos os departamentos</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          <option value="none">Sem departamento</option>
        </select>
        <span className="muted small tabular">{shown.length === 1 ? "1 pessoa" : `${shown.length} pessoas`}</span>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Nível</th>
              <th>Departamentos</th>
              <th>Operações</th>
              <th>Situação</th>
              <th><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((m) =>
              deleting === m.id ? (
                <tr key={m.id}>
                  <td colSpan={6}>
                    <div role="group" aria-labelledby={`delete-title-${m.id}`} style={{ padding: 16, borderRadius: 16, background: "var(--danger-soft)" }}>
                      <p id={`delete-title-${m.id}`} style={{ fontWeight: 600 }}>Excluir {m.full_name || m.email}?</p>
                      <p className="small muted" style={{ marginTop: 4, overflowWrap: "anywhere" }}>
                        O cadastro de {m.email} e a conta de login serão excluídos permanentemente. As sessões serão encerradas.
                      </p>
                      <p className="small muted" style={{ marginTop: 6 }}>
                        Se houver documentos vinculados, desative o acesso e transfira os documentos em Editar antes de excluir.
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        <button type="button" className="btn btn-quiet btn-sm" autoFocus disabled={pending} onClick={() => setDeleting(null)}>Cancelar</button>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          disabled={pending}
                          onClick={() => run(() => deleteMember(m.id), () => {
                            setDeleting(null);
                            setMessage({ text: `${m.full_name || m.email} foi excluído. O acesso foi encerrado.` });
                          })}
                        >
                          <Trash2 size={16} aria-hidden="true" /> {pending ? "Excluindo…" : "Excluir usuário"}
                        </button>
                        <button type="button" className="btn btn-quiet btn-sm" disabled={pending} onClick={() => edit(m)}>Editar pessoa</button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : editing === m.id ? (
                <tr key={m.id}>
                  <td colSpan={6}>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        run(() => updateMember(m.id, draft), () => setEditing(null));
                      }}
                      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, padding: 14, borderRadius: 16, background: "var(--action-soft)" }}
                    >
                      <div>
                        <label className="label" htmlFor={`n-${m.id}`}>Nome</label>
                        <input id={`n-${m.id}`} className="field" value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="label" htmlFor={`e-${m.id}`}>E-mail</label>
                        <input
                          id={`e-${m.id}`}
                          className="field"
                          type="email"
                          value={draft.email}
                          readOnly={!isMaster}
                          aria-describedby={isMaster ? undefined : `e-${m.id}-hint`}
                          onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                          style={isMaster ? undefined : { opacity: 0.7, cursor: "not-allowed" }}
                        />
                        {!isMaster && <span id={`e-${m.id}-hint`} className="muted small">Só um Master altera o e-mail.</span>}
                      </div>
                      <div>
                        <label className="label" htmlFor={`l-${m.id}`}>Nível</label>
                        <select id={`l-${m.id}`} className="select" value={draft.level} onChange={(e) => setDraft({ ...draft, level: e.target.value as Level })}>
                          {allowedLevels.map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
                        </select>
                      </div>
                      <MultiPicker label="Operações" options={opOptions} value={draft.operations} onChange={(operations) => setDraft({ ...draft, operations })} />
                      <MultiPicker label="Departamentos" options={depOptions} value={draft.departments} onChange={(d) => setDraft({ ...draft, departments: d })} />
                      <div>
                        <span className="label">Acesso</span>
                        <label style={{ display: "inline-flex", gap: 8, alignItems: "center", minHeight: 44 }}>
                          <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} style={{ accentColor: "var(--action)", width: 18, height: 18 }} />
                          {draft.active ? "Ativo" : "Desativado"}
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", gridColumn: "1 / -1" }}>
                        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}><Check size={16} /> Salvar</button>
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => setEditing(null)}>Cancelar</button>
                        {m.id !== myId && (isMaster || (myLevel === "admin" && (m.level === "operacao" || m.level === "gestor"))) && (
                          <button
                            type="button"
                            className="btn btn-quiet btn-sm"
                            style={{ marginLeft: "auto" }}
                            disabled={pending}
                            onClick={() => {
                              if (resetArmed !== m.id) return setResetArmed(m.id);
                              setResetArmed(null);
                              run(() => resetMfa(m.id), () => setMessage({ text: `Verificação em duas etapas de ${m.full_name || m.email} redefinida. No próximo acesso a pessoa configura de novo.` }));
                            }}
                          >
                            <ShieldOff size={16} /> {resetArmed === m.id ? "Confirmar redefinição" : "Redefinir verificação em duas etapas"}
                          </button>
                        )}
                      </div>
                      {isMaster && !m.active && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                          <div style={{ flex: 1, minWidth: 220 }}>
                            <label className="label" htmlFor={`t-${m.id}`}>Transferir os documentos para</label>
                            <select id={`t-${m.id}`} className="select" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}>
                              <option value="">Escolha quem recebe</option>
                              {members.filter((x) => x.active && x.id !== m.id).map((x) => (
                                <option key={x.id} value={x.id}>{x.full_name || x.email}</option>
                              ))}
                            </select>
                          </div>
                          <button
                            type="button"
                            className="btn btn-glass btn-sm"
                            disabled={!transferTo || pending}
                            onClick={() => run(() => transferDocuments(m.id, transferTo), (d) => setMessage({ text: `${d?.moved ?? 0} documentos transferidos, sem abrir o conteúdo.` }))}
                          >
                            <ArrowRightLeft size={16} /> Transferir
                          </button>
                        </div>
                      )}
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={m.id} style={{ opacity: m.active ? 1 : 0.6 }}>
                  <td>
                    <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span className="avatar" aria-hidden="true">{m.avatar_url ? <img src={m.avatar_url} alt="" /> : initials(m.full_name || m.email)}</span>
                      <span style={{ lineHeight: 1.3 }}>
                        <span style={{ display: "block", fontWeight: 600 }}>{m.full_name || "Sem nome"}</span>
                        <span className="muted small">{m.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>{LEVEL_LABEL[m.level]}</td>
                  <td>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {depsOf(m.id).map((id) => {
                        const d = departments.find((x) => x.id === id);
                        return d ? <span key={id} className="pill" style={{ "--c": d.color } as React.CSSProperties}>{d.name}</span> : null;
                      })}
                    </span>
                  </td>
                  <td>
                    <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {opsOf(m.id).map((id) => {
                        const o = operations.find((x) => x.id === id);
                        return o ? <span key={id} className="pill pill-dot" style={{ "--c": o.color } as React.CSSProperties}>{o.name}</span> : null;
                      })}
                    </span>
                  </td>
                  <td className="small">
                    {!m.active ? "Desativado" : m.auth_user_id ? "Ativo" : "Aguardando primeiro acesso"}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 4 }}>
                      {canTouch(m) && (
                        <button type="button" className="icon-btn" aria-label={`Editar ${m.full_name || m.email}`} title="Editar" disabled={pending} onClick={() => edit(m)}>
                          <Pencil size={16} />
                        </button>
                      )}
                      {isMaster && m.id !== myId && (
                        <button
                          type="button"
                          className="icon-btn"
                          style={{ color: "var(--danger)" }}
                          aria-label={`Excluir ${m.full_name || m.email}`}
                          title="Excluir usuário"
                          disabled={pending}
                          onClick={() => {
                            setEditing(null);
                            setMessage(null);
                            setDeleting(m.id);
                          }}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {editing && <button type="button" className="sr-only" onClick={() => setEditing(null)}><X /></button>}
    </section>
  );
}
