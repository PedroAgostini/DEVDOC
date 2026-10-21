-- Usage metrics: views and copies per document, and searches that found nothing.

create type public.doc_event_kind as enum ('view', 'copy');

create table public.doc_events (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  kind public.doc_event_kind not null,
  created_at timestamptz not null default now()
);

create index doc_events_doc_idx on public.doc_events (document_id, created_at desc);
create index doc_events_time_idx on public.doc_events (created_at desc);

create table public.search_misses (
  id bigint generated always as identity primary key,
  q text not null,
  member_id uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create index search_misses_time_idx on public.search_misses (created_at desc);

alter table public.doc_events enable row level security;
alter table public.search_misses enable row level security;

-- Counts are visible to whoever can read the document; writes go through the functions below.
create policy "events readable with document" on public.doc_events
  for select to authenticated using (public.can_read_document(document_id));

create policy "misses readable by managers" on public.search_misses
  for select to authenticated using (public.level_rank(public.current_level()) >= 2);

create or replace function public.track_doc_event(doc_id uuid, event public.doc_event_kind)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_member_id();
begin
  if me is null or not public.can_read_document(doc_id) then return; end if;
  -- One view per person per document every 30 minutes.
  if event = 'view' and exists (
    select 1 from public.doc_events
    where document_id = doc_id and member_id = me and kind = 'view'
      and created_at > now() - interval '30 minutes'
  ) then return; end if;
  insert into public.doc_events (document_id, member_id, kind) values (doc_id, me, event);
end $$;

-- Keeps only the finished query: a longer query replaces its own prefixes typed a moment before.
create or replace function public.log_search_miss(query text)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_member_id();
  term text := lower(trim(query));
begin
  if me is null or length(term) < 3 then return; end if;
  delete from public.search_misses
  where member_id = me and created_at > now() - interval '2 minutes'
    and (term like q || '%' or q = term);
  insert into public.search_misses (q, member_id) values (term, me);
end $$;

-- Readable documents with their views, distinct viewers and copies in the period. RLS applies.
create or replace function public.doc_metrics(days int default 30)
returns table (document_id uuid, views bigint, viewers bigint, copies bigint)
language sql stable set search_path = public as $$
  select e.document_id,
         count(*) filter (where e.kind = 'view'),
         count(distinct e.member_id) filter (where e.kind = 'view'),
         count(*) filter (where e.kind = 'copy')
  from public.doc_events e
  where e.created_at > now() - make_interval(days => days)
  group by e.document_id
$$;

create or replace function public.top_search_misses(days int default 30)
returns table (q text, times bigint, people bigint, last_at timestamptz)
language sql stable set search_path = public as $$
  select q, count(*), count(distinct member_id), max(created_at)
  from public.search_misses
  where created_at > now() - make_interval(days => days)
  group by q
  order by count(*) desc, max(created_at) desc
  limit 20
$$;
