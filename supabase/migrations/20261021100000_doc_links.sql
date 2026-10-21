-- Links between documents, extracted from the published Markdown ([text](/d/<id>)).

create table public.doc_links (
  source_id uuid not null references public.documents(id) on delete cascade,
  target_id uuid not null references public.documents(id) on delete cascade,
  primary key (source_id, target_id)
);

create index doc_links_target_idx on public.doc_links (target_id);

alter table public.doc_links enable row level security;

-- A link is visible only when both ends are readable.
create policy "links readable with both documents" on public.doc_links
  for select to authenticated
  using (public.can_read_document(source_id) and public.can_read_document(target_id));

create or replace function public.documents_sync_links()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.doc_links where source_id = new.id;
  if new.status = 'published' and new.deleted_at is null then
    insert into public.doc_links (source_id, target_id)
    select distinct new.id, d.id
    from regexp_matches(new.content_md, '\]\(\s*/d/([0-9a-fA-F-]{36})', 'g') as m
    join public.documents d on d.id = public.try_uuid(m[1])
    where d.id <> new.id
    on conflict do nothing;
  end if;
  return null;
end $$;

create trigger documents_sync_links
after insert or update of content_md, status, deleted_at on public.documents
for each row execute function public.documents_sync_links();

-- Backfill from what is already published.
update public.documents set content_md = content_md where status = 'published';
