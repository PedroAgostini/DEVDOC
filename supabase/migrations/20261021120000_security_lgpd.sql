-- Security and LGPD hardening:
-- 1. Usage records keep a salted SHA-256 of the person, never the person (pseudonymization).
-- 2. Only the author (or an Admin, never on private documents) changes who a document is shared with.
-- 3. An audit trail of access and visibility changes, readable only by Masters.
-- 4. Retention limits for activity data.

create extension if not exists pgcrypto with schema extensions;

/* 1. Pseudonymization ----------------------------------------------------------------- */

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.settings (
  key text primary key,
  value text not null
);
revoke all on private.settings from public, anon, authenticated;

insert into private.settings (key, value)
values ('hash_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

create or replace function private.member_hash(m uuid)
returns text language sql stable security definer set search_path = public, extensions as $$
  select encode(
    extensions.digest(m::text || (select value from private.settings where key = 'hash_salt'), 'sha256'),
    'hex'
  )
$$;
revoke execute on function private.member_hash(uuid) from public, anon, authenticated;

alter table public.doc_events add column member_hash text;
update public.doc_events set member_hash = private.member_hash(member_id) where member_id is not null;
alter table public.doc_events drop column member_id;
create index doc_events_hash_idx on public.doc_events (document_id, member_hash, created_at desc);

alter table public.search_misses add column member_hash text;
update public.search_misses set member_hash = private.member_hash(member_id) where member_id is not null;
alter table public.search_misses drop column member_id;

create or replace function public.track_doc_event(doc_id uuid, event public.doc_event_kind)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_member_id();
  h text;
begin
  if me is null or not public.can_read_document(doc_id) then return; end if;
  h := private.member_hash(me);
  if event = 'view' and exists (
    select 1 from public.doc_events
    where document_id = doc_id and member_hash = h and kind = 'view'
      and created_at > now() - interval '30 minutes'
  ) then return; end if;
  insert into public.doc_events (document_id, member_hash, kind) values (doc_id, h, event);
end $$;

create or replace function public.log_search_miss(query text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_member_id();
  term text := lower(trim(query));
  h text;
begin
  if me is null or length(term) < 3 then return; end if;
  h := private.member_hash(me);
  delete from public.search_misses
  where member_hash = h and created_at > now() - interval '2 minutes'
    and (term like q || '%' or q = term);
  insert into public.search_misses (q, member_hash) values (term, h);
end $$;

create or replace function public.doc_metrics(days int default 30)
returns table (document_id uuid, views bigint, viewers bigint, copies bigint)
language sql stable set search_path = public as $$
  select e.document_id,
         count(*) filter (where e.kind = 'view'),
         count(distinct e.member_hash) filter (where e.kind = 'view'),
         count(*) filter (where e.kind = 'copy')
  from public.doc_events e
  where e.created_at > now() - make_interval(days => days)
  group by e.document_id
$$;

create or replace function public.top_search_misses(days int default 30)
returns table (q text, times bigint, people bigint, last_at timestamptz)
language sql stable set search_path = public as $$
  select q, count(*), count(distinct member_hash), max(created_at)
  from public.search_misses
  where created_at > now() - make_interval(days => days)
  group by q
  order by count(*) desc, max(created_at) desc
  limit 20
$$;

/* 2. Who may change sharing ---------------------------------------------------------- */

create or replace function public.can_manage_access(doc_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.documents d
    where d.id = doc_id
      and (d.author_id = public.current_member_id() or (public.is_admin() and d.visibility <> 'private'))
  )
$$;

do $$
declare t text;
begin
  foreach t in array array['document_groups', 'document_people', 'document_editors'] loop
    execute format('drop policy if exists "%1$s insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s delete" on public.%1$I', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert to authenticated with check (public.can_manage_access(document_id))', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete to authenticated using (public.can_manage_access(document_id))', t);
  end loop;
end $$;

/* 3. Audit trail ----------------------------------------------------------------------- */

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid references public.members(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb not null default '{}'::jsonb
);
create index audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;
create policy "audit readable by masters" on public.audit_log
  for select to authenticated using (public.is_master());
-- No insert, update or delete policies: only the triggers below write, and nobody edits history.

create or replace function public.audit(p_action text, p_entity text, p_entity_id uuid, p_detail jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, detail)
  values (public.current_member_id(), p_action, p_entity, p_entity_id, coalesce(p_detail, '{}'::jsonb))
$$;
revoke execute on function public.audit(text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public.audit_members()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.audit('acesso liberado', 'pessoa', new.id, jsonb_build_object('email', new.email, 'nivel', new.level));
  elsif tg_op = 'DELETE' then
    perform public.audit('pessoa removida', 'pessoa', old.id, jsonb_build_object('email', old.email));
    return old;
  else
    if new.level <> old.level then
      perform public.audit('nível alterado', 'pessoa', new.id, jsonb_build_object('email', new.email, 'de', old.level, 'para', new.level));
    end if;
    if new.active <> old.active then
      perform public.audit(case when new.active then 'acesso reativado' else 'acesso desativado' end, 'pessoa', new.id, jsonb_build_object('email', new.email));
    end if;
  end if;
  return new;
end $$;

create trigger audit_members
after insert or update or delete on public.members
for each row execute function public.audit_members();

-- Private documents are logged without their title: private stays private, even in the audit.
create or replace function public.audit_documents()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  t text;
begin
  if tg_op = 'DELETE' then
    perform public.audit('documento excluído de vez', 'documento', old.id,
      jsonb_build_object('titulo', case when old.visibility = 'private' then '(documento privado)' else coalesce(nullif(old.title, ''), old.draft_title, 'Sem título') end));
    return old;
  end if;
  t := case when new.visibility = 'private' and old.visibility = 'private' then '(documento privado)'
            else coalesce(nullif(new.title, ''), new.draft_title, 'Sem título') end;
  if new.visibility <> old.visibility or new.min_level <> old.min_level then
    perform public.audit('visibilidade alterada', 'documento', new.id,
      jsonb_build_object('titulo', t, 'de', old.visibility, 'para', new.visibility, 'nivel', new.min_level));
  end if;
  if new.author_id <> old.author_id then
    perform public.audit('posse transferida', 'documento', new.id, jsonb_build_object('titulo', t));
  end if;
  if new.deleted_at is not null and old.deleted_at is null then
    perform public.audit('enviado para a lixeira', 'documento', new.id, jsonb_build_object('titulo', t));
  elsif new.deleted_at is null and old.deleted_at is not null then
    perform public.audit('restaurado da lixeira', 'documento', new.id, jsonb_build_object('titulo', t));
  end if;
  return new;
end $$;

create trigger audit_documents
after update or delete on public.documents
for each row execute function public.audit_documents();

create or replace function public.audit_access_rows()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  verb text := case when tg_op = 'DELETE' then 'removido' else 'concedido' end;
  who text;
  what text;
  title text;
begin
  if tg_table_name in ('document_people', 'document_editors', 'member_operations', 'member_departments') then
    select email into who from public.members where id = (r->>'member_id')::uuid;
  end if;
  if tg_table_name = 'document_groups' then
    select name into who from public.groups where id = (r->>'group_id')::uuid;
  end if;
  if r ? 'document_id' then
    select coalesce(nullif(title, ''), draft_title, 'Sem título') into title
    from public.documents where id = (r->>'document_id')::uuid;
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
      'titulo', title,
      'operacao', (select name from public.operations where id = (r->>'operation_id')::uuid),
      'departamento', (select name from public.departments where id = (r->>'department_id')::uuid)
    ))
  );
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['document_people', 'document_groups', 'document_editors', 'member_operations', 'member_departments'] loop
    execute format('create trigger audit_%1$s after insert or delete on public.%1$I for each row execute function public.audit_access_rows()', t);
  end loop;
end $$;

/* 4. Retention ------------------------------------------------------------------------- */

create or replace function public.purge_activity()
returns void language sql security definer set search_path = public as $$
  delete from public.search_misses where created_at < now() - interval '90 days';
  delete from public.doc_events where created_at < now() - interval '365 days';
  delete from public.document_views where viewed_at < now() - interval '365 days';
  delete from public.audit_log where at < now() - interval '5 years';
$$;
revoke execute on function public.purge_activity() from public, anon, authenticated;

do $$
begin
  perform cron.schedule('devdoc-purge-activity', '30 3 * * *', 'select public.purge_activity()');
exception when others then
  raise notice 'pg_cron indisponível: rode select public.purge_activity() periodicamente';
end $$;
