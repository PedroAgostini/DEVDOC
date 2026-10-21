-- DEVDOC: schema, permissions and helpers.
-- Read access is decided here, in the database, never only in the interface.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.member_level as enum ('operacao', 'gestor', 'admin', 'master');
create type public.doc_visibility as enum ('all', 'level', 'groups', 'people', 'private');
create type public.doc_status as enum ('draft', 'published');

create or replace function public.level_rank(l public.member_level)
returns int language sql immutable as $$
  select case l when 'operacao' then 1 when 'gestor' then 2 when 'admin' then 3 when 'master' then 4 end
$$;

create or replace function public.try_uuid(t text)
returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

-- People ---------------------------------------------------------------

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text not null unique check (email = lower(email)),
  full_name text not null default '',
  avatar_url text,
  level public.member_level not null default 'operacao',
  active boolean not null default true,
  invited_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.operations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#2E8C8A',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.member_operations (
  member_id uuid not null references public.members(id) on delete cascade,
  operation_id uuid not null references public.operations(id) on delete cascade,
  primary key (member_id, operation_id)
);

-- A group with operation_id is the automatic group of that operation.
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operation_id uuid unique references public.operations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (group_id, member_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#4F8FC0',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

-- Documents --------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  summary text not null default '',
  content_md text not null default '',
  draft_title text,
  draft_summary text,
  draft_md text,
  draft_updated_at timestamptz,
  status public.doc_status not null default 'draft',
  category_id uuid references public.categories(id) on delete set null,
  operation_id uuid references public.operations(id) on delete set null,
  author_id uuid not null references public.members(id),
  visibility public.doc_visibility not null default 'all',
  min_level public.member_level not null default 'operacao',
  tags text[] not null default '{}',
  code_languages text[] not null default '{}',
  pinned boolean not null default false,
  version int not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  search tsvector
);

create index documents_search_idx on public.documents using gin (search);
create index documents_tags_idx on public.documents using gin (tags);
create index documents_langs_idx on public.documents using gin (code_languages);
create index documents_operation_idx on public.documents (operation_id);
create index documents_category_idx on public.documents (category_id);
create index documents_author_idx on public.documents (author_id);
create index documents_published_idx on public.documents (published_at desc);

create table public.document_clients (
  document_id uuid not null references public.documents(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  primary key (document_id, client_id)
);

create table public.document_groups (
  document_id uuid not null references public.documents(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  primary key (document_id, group_id)
);

create table public.document_people (
  document_id uuid not null references public.documents(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (document_id, member_id)
);

create table public.document_editors (
  document_id uuid not null references public.documents(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  primary key (document_id, member_id)
);

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version int not null,
  title text not null,
  summary text not null default '',
  content_md text not null,
  author_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.favorites (
  member_id uuid not null references public.members(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (member_id, document_id)
);

create table public.document_views (
  member_id uuid not null references public.members(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (member_id, document_id)
);

-- Identity helpers ---------------------------------------------------------

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members where auth_user_id = auth.uid() and active
$$;

create or replace function public.current_level()
returns public.member_level language sql stable security definer set search_path = public as $$
  select level from public.members where auth_user_id = auth.uid() and active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_level() in ('admin', 'master'), false)
$$;

create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.current_level() = 'master', false)
$$;

create or replace function public.manages_operation(op uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or (
    public.current_level() = 'gestor'
    and exists (
      select 1 from public.member_operations
      where operation_id = op and member_id = public.current_member_id()
    )
  )
$$;

create or replace function public.in_group(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members where group_id = g and member_id = public.current_member_id()
  ) or exists (
    select 1 from public.groups gr
    join public.member_operations mo on mo.operation_id = gr.operation_id
    where gr.id = g and mo.member_id = public.current_member_id()
  )
$$;

-- Document access ------------------------------------------------------------

create or replace function public.can_read_document(doc_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  d public.documents;
  me uuid := public.current_member_id();
begin
  if me is null or doc_id is null then return false; end if;
  select * into d from public.documents where id = doc_id;
  if not found then return false; end if;
  if d.author_id = me then return true; end if;
  -- Private and unpublished documents belong to the author alone.
  if d.visibility = 'private' or d.status = 'draft' then return false; end if;
  if d.deleted_at is not null then return public.is_admin(); end if;
  if public.is_admin() then return true; end if;
  if exists (select 1 from public.document_editors where document_id = d.id and member_id = me) then return true; end if;
  if d.operation_id is not null and public.manages_operation(d.operation_id) then return true; end if;
  case d.visibility
    when 'all' then return true;
    when 'level' then return public.level_rank(public.current_level()) >= public.level_rank(d.min_level);
    when 'groups' then
      return exists (select 1 from public.document_groups dg where dg.document_id = d.id and public.in_group(dg.group_id));
    when 'people' then
      return exists (select 1 from public.document_people where document_id = d.id and member_id = me);
    else return false;
  end case;
end $$;

create or replace function public.can_edit_document(doc_id uuid)
returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  d public.documents;
  me uuid := public.current_member_id();
begin
  if me is null or doc_id is null then return false; end if;
  select * into d from public.documents where id = doc_id;
  if not found then return false; end if;
  if d.author_id = me then return true; end if;
  if d.visibility = 'private' then return false; end if;
  if public.is_admin() then return true; end if;
  if d.deleted_at is not null then return false; end if;
  if exists (select 1 from public.document_editors where document_id = d.id and member_id = me) then return true; end if;
  if d.operation_id is not null and public.manages_operation(d.operation_id) then return true; end if;
  return false;
end $$;

-- Triggers -------------------------------------------------------------------

create or replace function public.documents_before_write()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  if tg_op = 'UPDATE' and coalesce(current_setting('devdoc.transfer', true), '') <> 'on' and auth.uid() is not null then
    if new.author_id <> old.author_id then
      raise exception 'A posse só muda pela transferência feita por um Master';
    end if;
    if (new.visibility <> old.visibility or new.min_level <> old.min_level)
       and old.author_id <> public.current_member_id() and not public.is_admin() then
      raise exception 'Só o autor ou um Admin altera a visibilidade';
    end if;
  end if;

  new.updated_at := now();
  new.search :=
    setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.title, ''))), 'A') ||
    setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.summary, '') || ' ' || array_to_string(new.tags, ' '))), 'B') ||
    setweight(to_tsvector('portuguese', extensions.unaccent(coalesce(new.content_md, ''))), 'C');
  new.code_languages := coalesce((
    select array_agg(distinct lower(m[1]))
    from regexp_matches(coalesce(new.content_md, '') || E'\n' || coalesce(new.draft_md, ''), '```([A-Za-z0-9_+#.-]+)', 'g') as m
  ), '{}');
  return new;
end $$;

create trigger documents_before_write
before insert or update on public.documents
for each row execute function public.documents_before_write();

create or replace function public.members_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service role, migrations and the sign-up trigger run without a user.
  if auth.uid() is null then return new; end if;

  if tg_op = 'INSERT' then
    if not public.is_admin() then raise exception 'Só Admin ou Master cadastra pessoas'; end if;
    if new.level in ('admin', 'master') and not public.is_master() then
      raise exception 'Só um Master cadastra Admin ou Master';
    end if;
    return new;
  end if;

  if not public.is_admin() then
    if new.level <> old.level or new.active <> old.active or new.email <> old.email
       or new.auth_user_id is distinct from old.auth_user_id then
      raise exception 'Sem permissão para alterar este cadastro';
    end if;
    return new;
  end if;

  if (new.level in ('admin', 'master') or old.level in ('admin', 'master'))
     and (new.level <> old.level or new.active <> old.active)
     and not public.is_master() then
    raise exception 'Só um Master altera Admin ou Master';
  end if;
  return new;
end $$;

create trigger members_guard
before insert or update on public.members
for each row execute function public.members_guard();

-- Every operation gets its automatic group.
create or replace function public.operations_sync_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.groups (name, operation_id) values (new.name, new.id);
  elsif new.name <> old.name then
    update public.groups set name = new.name where operation_id = new.id;
  end if;
  return new;
end $$;

create trigger operations_sync_group
after insert or update on public.operations
for each row execute function public.operations_sync_group();

-- Only pre-registered, active emails can create an account.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m public.members;
begin
  select * into m from public.members where email = lower(new.email);
  if not found or not m.active then
    raise exception 'DEVDOC_NOT_INVITED';
  end if;
  update public.members set
    auth_user_id = new.id,
    full_name = case when full_name = '' then coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)) else full_name end,
    avatar_url = coalesce(avatar_url, new.raw_user_meta_data->>'avatar_url')
  where id = m.id;
  return new;
end $$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- Actions ----------------------------------------------------------------------

create or replace function public.publish_document(doc_id uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  d public.documents;
begin
  if not public.can_edit_document(doc_id) then raise exception 'Sem permissão para publicar'; end if;
  select * into d from public.documents where id = doc_id for update;
  if d.deleted_at is not null then raise exception 'Documento está na lixeira'; end if;
  if coalesce(nullif(trim(coalesce(d.draft_title, d.title)), ''), '') = '' then
    raise exception 'Dê um título antes de publicar';
  end if;

  update public.documents set
    title = coalesce(d.draft_title, d.title),
    summary = coalesce(d.draft_summary, d.summary),
    content_md = coalesce(d.draft_md, d.content_md),
    draft_title = null, draft_summary = null, draft_md = null, draft_updated_at = null,
    status = 'published',
    version = d.version + 1,
    published_at = now()
  where id = doc_id;

  insert into public.document_versions (document_id, version, title, summary, content_md, author_id)
  select id, version, title, summary, content_md, public.current_member_id()
  from public.documents where id = doc_id;

  return d.version + 1;
end $$;

-- Brings an old version back as the working draft; publishing makes it current.
create or replace function public.restore_version(version_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v public.document_versions;
begin
  select * into v from public.document_versions where id = version_id;
  if not found then raise exception 'Versão não encontrada'; end if;
  if not public.can_edit_document(v.document_id) then raise exception 'Sem permissão'; end if;
  update public.documents set
    draft_title = v.title, draft_summary = v.summary, draft_md = v.content_md, draft_updated_at = now()
  where id = v.document_id;
  return v.document_id;
end $$;

-- Master moves a deactivated person's documents without reading them.
create or replace function public.transfer_documents(from_member uuid, to_member uuid)
returns int language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not public.is_master() then raise exception 'Só um Master transfere documentos'; end if;
  if exists (select 1 from public.members where id = from_member and active) then
    raise exception 'Desative a pessoa antes de transferir os documentos';
  end if;
  if not exists (select 1 from public.members where id = to_member and active) then
    raise exception 'Quem recebe precisa estar ativo';
  end if;
  perform set_config('devdoc.transfer', 'on', true);
  update public.documents set author_id = to_member where author_id = from_member;
  get diagnostics n = row_count;
  perform set_config('devdoc.transfer', 'off', true);
  return n;
end $$;

create or replace function public.search_documents(q text)
returns setof public.documents language sql stable set search_path = public, extensions as $$
  select d.*
  from public.documents d
  where d.deleted_at is null
    and (
      d.search @@ websearch_to_tsquery('portuguese', extensions.unaccent(q))
      or extensions.unaccent(coalesce(d.draft_title, d.title)) ilike '%' || extensions.unaccent(q) || '%'
    )
  order by ts_rank(d.search, websearch_to_tsquery('portuguese', extensions.unaccent(q))) desc,
           d.published_at desc nulls last
$$;

create or replace function public.doc_counts()
returns table (category_id uuid, operation_id uuid, total bigint)
language sql stable set search_path = public as $$
  select category_id, operation_id, count(*)
  from public.documents
  where status = 'published' and deleted_at is null
  group by 1, 2
$$;

create or replace function public.purge_trash()
returns void language sql security definer set search_path = public as $$
  delete from public.documents where deleted_at < now() - interval '30 days'
$$;
revoke execute on function public.purge_trash() from public, anon, authenticated;

-- Row level security ---------------------------------------------------------------

alter table public.members enable row level security;
alter table public.operations enable row level security;
alter table public.member_operations enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.clients enable row level security;
alter table public.categories enable row level security;
alter table public.documents enable row level security;
alter table public.document_clients enable row level security;
alter table public.document_groups enable row level security;
alter table public.document_people enable row level security;
alter table public.document_editors enable row level security;
alter table public.document_versions enable row level security;
alter table public.favorites enable row level security;
alter table public.document_views enable row level security;

create policy "members readable by members" on public.members
  for select to authenticated using (public.current_member_id() is not null);
create policy "admins add members" on public.members
  for insert to authenticated with check (public.is_admin());
create policy "admins or self update member" on public.members
  for update to authenticated using (public.is_admin() or auth_user_id = auth.uid());
create policy "masters remove members" on public.members
  for delete to authenticated using (public.is_master());

-- Reference tables: everyone reads, admins write.
do $$
declare t text;
begin
  foreach t in array array['operations', 'groups', 'clients', 'categories', 'group_members'] loop
    execute format('create policy "%1$s readable" on public.%1$I for select to authenticated using (public.current_member_id() is not null)', t);
    execute format('create policy "%1$s admin insert" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s admin update" on public.%1$I for update to authenticated using (public.is_admin())', t);
    execute format('create policy "%1$s admin delete" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

create policy "member_operations readable" on public.member_operations
  for select to authenticated using (public.current_member_id() is not null);
create policy "managers add to operation" on public.member_operations
  for insert to authenticated with check (public.manages_operation(operation_id));
create policy "managers remove from operation" on public.member_operations
  for delete to authenticated using (public.manages_operation(operation_id));

create policy "read visible documents" on public.documents
  for select to authenticated using (public.can_read_document(id));
create policy "members create own documents" on public.documents
  for insert to authenticated with check (author_id = public.current_member_id());
create policy "editors update documents" on public.documents
  for update to authenticated using (public.can_edit_document(id));
create policy "delete from trash" on public.documents
  for delete to authenticated using (
    deleted_at is not null
    and (author_id = public.current_member_id() or (public.is_admin() and visibility <> 'private'))
  );

do $$
declare t text;
begin
  foreach t in array array['document_clients', 'document_groups', 'document_people', 'document_editors'] loop
    execute format('create policy "%1$s read" on public.%1$I for select to authenticated using (public.can_read_document(document_id))', t);
    execute format('create policy "%1$s insert" on public.%1$I for insert to authenticated with check (public.can_edit_document(document_id))', t);
    execute format('create policy "%1$s delete" on public.%1$I for delete to authenticated using (public.can_edit_document(document_id))', t);
  end loop;
end $$;

create policy "versions readable with document" on public.document_versions
  for select to authenticated using (public.can_read_document(document_id));

create policy "own favorites" on public.favorites
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id() and public.can_read_document(document_id));

create policy "own views" on public.document_views
  for all to authenticated
  using (member_id = public.current_member_id())
  with check (member_id = public.current_member_id() and public.can_read_document(document_id));

-- Images ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('doc-images', 'doc-images', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "doc images read" on storage.objects
  for select to authenticated
  using (bucket_id = 'doc-images' and public.can_read_document(public.try_uuid((storage.foldername(name))[1])));
create policy "doc images upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'doc-images' and public.can_edit_document(public.try_uuid((storage.foldername(name))[1])));
create policy "doc images delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'doc-images' and public.can_edit_document(public.try_uuid((storage.foldername(name))[1])));

-- Trash cleanup, daily. Skipped where pg_cron is unavailable.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('devdoc-purge-trash', '0 3 * * *', 'select public.purge_trash()');
exception when others then
  raise notice 'pg_cron indisponível: rode select public.purge_trash() periodicamente';
end $$;

-- Starting data --------------------------------------------------------------------

insert into public.operations (name, slug, color, sort) values
  ('TS01', 'ts01', '#2E8C8A', 1),
  ('TS02', 'ts02', '#4F8FC0', 2),
  ('TS BRASIL', 'ts-brasil', '#3F8F5E', 3),
  ('INOVAÇÃO', 'inovacao', '#5B5FC7', 4),
  ('ADM', 'adm', '#B08A3E', 5),
  ('DIRETORIA', 'diretoria', '#24467A', 6);

insert into public.categories (name, slug, color, sort) values
  ('Documentação', 'documentacao', '#4F8FC0', 1),
  ('Prompt', 'prompt', '#8A5CC2', 2),
  ('Código', 'codigo', '#2E8C8A', 3),
  ('Resolução de problemas', 'resolucao-de-problemas', '#C0533A', 4),
  ('Processo', 'processo', '#B08A3E', 5),
  ('Onboarding', 'onboarding', '#3F8F5E', 6);
