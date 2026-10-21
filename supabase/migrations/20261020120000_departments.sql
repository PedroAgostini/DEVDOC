-- Departments: a person belongs to several; each is an automatic access group;
-- a document may belong to one department.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  color text not null default '#4F8FC0',
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table public.member_departments (
  member_id uuid not null references public.members(id) on delete cascade,
  department_id uuid not null references public.departments(id) on delete cascade,
  primary key (member_id, department_id)
);

alter table public.groups
  add column department_id uuid unique references public.departments(id) on delete cascade;

alter table public.documents
  add column department_id uuid references public.departments(id) on delete set null;

create index documents_department_idx on public.documents (department_id);

-- Group membership now also comes from departments.
create or replace function public.in_group(g uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members where group_id = g and member_id = public.current_member_id()
  ) or exists (
    select 1 from public.groups gr
    join public.member_operations mo on mo.operation_id = gr.operation_id
    where gr.id = g and mo.member_id = public.current_member_id()
  ) or exists (
    select 1 from public.groups gr
    join public.member_departments md on md.department_id = gr.department_id
    where gr.id = g and md.member_id = public.current_member_id()
  )
$$;

create or replace function public.departments_sync_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.groups (name, department_id) values (new.name, new.id);
  elsif new.name <> old.name then
    update public.groups set name = new.name where department_id = new.id;
  end if;
  return new;
end $$;

create trigger departments_sync_group
after insert or update on public.departments
for each row execute function public.departments_sync_group();

drop function if exists public.doc_counts();
create function public.doc_counts()
returns table (category_id uuid, operation_id uuid, department_id uuid, total bigint)
language sql stable set search_path = public as $$
  select category_id, operation_id, department_id, count(*)
  from public.documents
  where status = 'published' and deleted_at is null
  group by 1, 2, 3
$$;

alter table public.departments enable row level security;
alter table public.member_departments enable row level security;

create policy "departments readable" on public.departments
  for select to authenticated using (public.current_member_id() is not null);
create policy "departments admin insert" on public.departments
  for insert to authenticated with check (public.is_admin());
create policy "departments admin update" on public.departments
  for update to authenticated using (public.is_admin());
create policy "departments admin delete" on public.departments
  for delete to authenticated using (public.is_admin());

create policy "member_departments readable" on public.member_departments
  for select to authenticated using (public.current_member_id() is not null);
create policy "member_departments admin insert" on public.member_departments
  for insert to authenticated with check (public.is_admin());
create policy "member_departments admin delete" on public.member_departments
  for delete to authenticated using (public.is_admin());

insert into public.departments (name, slug, color, sort) values
  ('Web', 'web', '#2E8C8A', 1),
  ('Social Media', 'social-media', '#C2577A', 2),
  ('Tradução', 'traducao', '#4F8FC0', 3),
  ('Tráfego Pago', 'trafego-pago', '#B08A3E', 4),
  ('Audiovisual', 'audiovisual', '#8A5CC2', 5),
  ('Design', 'design', '#C0533A', 6),
  ('Gestão Estratégica', 'gestao-estrategica', '#24467A', 7),
  ('Gestão de Projetos', 'gestao-de-projetos', '#3F8F5E', 8),
  ('Comercial', 'comercial', '#7A8B3C', 9),
  ('Closer', 'closer', '#A3612E', 10),
  ('RH', 'rh', '#5B5FC7', 11),
  ('Financeiro', 'financeiro', '#2F6F8F', 12),
  ('Inovação', 'inovacao', '#7B86C9', 13),
  ('CEO', 'ceo', '#14284A', 14);
