-- A client is served by one operation (optional).
alter table public.clients
  add column operation_id uuid references public.operations(id) on delete set null;

create index clients_operation_idx on public.clients (operation_id);
