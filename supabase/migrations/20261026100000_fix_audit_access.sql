-- Fix: the variable "title" clashed with documents.title ("column reference is ambiguous"),
-- so sharing a document with a group, person or co-editor failed. Private documents are
-- logged without their title, like in audit_documents.

create or replace function public.audit_access_rows()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  verb text := case when tg_op = 'DELETE' then 'removido' else 'concedido' end;
  who text;
  what text;
  doc_title text;
begin
  if tg_table_name in ('document_people', 'document_editors', 'member_operations', 'member_departments') then
    select m.email into who from public.members m where m.id = (r->>'member_id')::uuid;
  end if;
  if tg_table_name = 'document_groups' then
    select g.name into who from public.groups g where g.id = (r->>'group_id')::uuid;
  end if;
  if r ? 'document_id' then
    select case when d.visibility = 'private' then '(documento privado)'
                else coalesce(nullif(d.title, ''), d.draft_title, 'Sem título') end
      into doc_title
    from public.documents d where d.id = (r->>'document_id')::uuid;
  end if;
  what := case tg_table_name
    when 'document_people' then 'compartilhamento com pessoa ' || verb
    when 'document_groups' then 'compartilhamento com grupo ' || verb
    when 'document_editors' then 'coedição ' || verb
    when 'member_operations' then 'operação ' || case when tg_op = 'DELETE' then 'removida' else 'atribuída' end
    when 'member_departments' then 'departamento ' || case when tg_op = 'DELETE' then 'removido' else 'atribuído' end
  end;
  perform public.audit(
    what,
    case when r ? 'document_id' then 'documento' else 'pessoa' end,
    coalesce((r->>'document_id')::uuid, (r->>'member_id')::uuid),
    jsonb_strip_nulls(jsonb_build_object(
      'com', who,
      'titulo', doc_title,
      'operacao', (select o.name from public.operations o where o.id = (r->>'operation_id')::uuid),
      'departamento', (select dp.name from public.departments dp where dp.id = (r->>'department_id')::uuid)
    ))
  );
  return null;
end $$;
