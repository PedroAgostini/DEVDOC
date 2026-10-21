export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** Turns database and auth errors into sentences a person can act on. */
export function friendlyError(message: string | undefined | null): string {
  const m = message ?? "";
  if (!m) return "Algo deu errado. Tente de novo.";
  if (/row-level security|permission denied|Sem permissão/i.test(m)) {
    return m.includes("Sem permissão") ? m : "Você não tem permissão para isso.";
  }
  if (/duplicate key/i.test(m)) {
    if (m.includes("members_email")) return "Esse e-mail já está cadastrado.";
    return "Já existe um item com esse nome.";
  }
  if (/violates foreign key/i.test(m)) return "Esse item está em uso e não pode ser removido.";
  if (/DEVDOC_NOT_INVITED/.test(m)) return "Esse e-mail não tem acesso ao DEVDOC. Peça a um Admin para liberar.";
  if (/check constraint.*email/i.test(m)) return "Use o e-mail em letras minúsculas.";
  return m;
}

export function fail(message: string | undefined | null): { ok: false; error: string } {
  return { ok: false, error: friendlyError(message) };
}
