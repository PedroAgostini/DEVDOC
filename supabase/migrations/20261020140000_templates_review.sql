-- Templates per category, and an owner plus a review cadence per document.

alter table public.categories
  add column template_md text not null default '',
  add column review_months int check (review_months is null or review_months between 1 and 36);

alter table public.documents
  add column owner_id uuid references public.members(id) on delete set null,
  add column review_interval_months int check (review_interval_months is null or review_interval_months between 1 and 36),
  add column reviewed_at timestamptz,
  add column review_due_at timestamptz;

update public.documents set owner_id = author_id where owner_id is null;

create index documents_owner_idx on public.documents (owner_id);
create index documents_review_due_idx on public.documents (review_due_at);

-- Owner defaults to the author; the due date follows the last publish or review.
create or replace function public.documents_review_dates()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then
    new.owner_id := new.author_id;
  end if;
  if new.review_interval_months is null or new.status <> 'published' then
    new.review_due_at := null;
  else
    new.review_due_at := greatest(coalesce(new.reviewed_at, new.published_at), coalesce(new.published_at, new.reviewed_at))
      + make_interval(months => new.review_interval_months);
  end if;
  return new;
end $$;

create trigger documents_review_dates
before insert or update on public.documents
for each row execute function public.documents_review_dates();

-- Touch rows so the trigger fills review_due_at for existing documents.
update public.documents set review_interval_months = review_interval_months;

create or replace function public.mark_reviewed(doc_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  at timestamptz := now();
begin
  if not public.can_edit_document(doc_id) then raise exception 'Sem permissão para revisar'; end if;
  update public.documents set reviewed_at = at where id = doc_id;
  return at;
end $$;

-- Overdue documents the member owns or whose operation they manage. RLS still applies.
create or replace function public.docs_due_for_review()
returns setof public.documents language sql stable set search_path = public as $$
  select d.* from public.documents d
  where d.deleted_at is null
    and d.review_due_at is not null
    and d.review_due_at < now()
    and (d.owner_id = public.current_member_id()
         or (d.operation_id is not null and public.manages_operation(d.operation_id)))
  order by d.review_due_at
$$;

-- Ownership moves with the documents of a deactivated person.
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
  update public.documents set owner_id = to_member where owner_id = from_member;
  perform set_config('devdoc.transfer', 'off', true);
  return n;
end $$;

update public.categories set review_months = 12, template_md = $md$## Objetivo

O que este documento explica e para quem.

## Contexto

O que a pessoa precisa saber antes de começar.

## Passo a passo

1.
2.
3.

## Referências

-
$md$ where slug = 'documentacao';

update public.categories set template_md = $md$Para que serve este prompt e em qual ferramenta usar.

## Prompt

Você é {{papel}}. Escreva para {{publico}} sobre {{tema}}, em tom {{tom}}.

## Exemplo de resultado

Cole aqui uma resposta boa que o prompt gerou.
$md$ where slug = 'prompt';

update public.categories set template_md = $md$O que o código faz e onde ele é usado.

```ts
// cole o código aqui
```

## Como usar

## Cuidados

-
$md$ where slug = 'codigo';

update public.categories set template_md = $md$## Sintoma

O que aconteceu, onde e como foi percebido.

## Causa

## Correção

1.
2.

## Como evitar

- [ ]
$md$ where slug = 'resolucao-de-problemas';

update public.categories set review_months = 6, template_md = $md$## Quando usar

## Responsáveis

## Etapas

1.
2.
3.

## Prazo e registro
$md$ where slug = 'processo';

update public.categories set review_months = 6, template_md = $md$## Primeira semana

- [ ]
- [ ]

## Pessoas para conhecer

## Leituras obrigatórias

-
$md$ where slug = 'onboarding';
