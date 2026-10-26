-- Remove the member and their login together, including open auth sessions.
-- Documents must be transferred first, including drafts and items in the trash.
create or replace function public.delete_member(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  target public.members;
begin
  if not public.is_master() then
    raise exception 'Só um Master pode excluir pessoas.';
  end if;
  if p_member = public.current_member_id() then
    raise exception 'Você não pode excluir sua própria conta.';
  end if;

  select * into target from public.members where id = p_member for update;
  if not found then
    raise exception 'Pessoa não encontrada.';
  end if;

  if exists (
    select 1 from public.documents where author_id = p_member or owner_id = p_member
  ) then
    raise exception 'Essa pessoa possui documentos. Desative o acesso e transfira os documentos em Editar antes de excluir.';
  end if;

  -- The existing audit trigger records who removed the member. If login deletion
  -- fails, this whole transaction rolls back, preserving the member and audit.
  delete from public.members where id = p_member;
  if target.auth_user_id is not null then
    delete from auth.users where id = target.auth_user_id;
  end if;
end;
$$;

revoke all on function public.delete_member(uuid) from public, anon;
grant execute on function public.delete_member(uuid) to authenticated;

-- Route removals through the atomic operation so a deleted member never leaves
-- an orphaned login that could be reused after a future invitation.
drop policy if exists "masters remove members" on public.members;
