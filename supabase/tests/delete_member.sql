-- Run with psql -v ON_ERROR_STOP=1 against a migrated local database.
-- All fixtures and changes are rolled back.
begin;

create function pg_temp.expect_delete_error(p_member uuid, expected text)
returns void language plpgsql as $$
begin
  begin
    perform public.delete_member(p_member);
  exception when raise_exception then
    if sqlerrm = expected then return; end if;
    raise;
  end;
  raise exception 'Expected deletion to fail: %', expected;
end;
$$;

create function pg_temp.reject_test_auth_delete()
returns trigger language plpgsql as $$
begin
  if old.email like '%@delete-test.local' then
    raise exception 'Simulated login deletion failure';
  end if;
  return old;
end;
$$;
create trigger reject_test_auth_delete before delete on auth.users
  for each row execute function pg_temp.reject_test_auth_delete();

do $$
declare
  master_id uuid := gen_random_uuid();
  master_auth uuid := gen_random_uuid();
  other_id uuid;
  other_auth uuid;
  target_id uuid := gen_random_uuid();
  target_auth uuid := gen_random_uuid();
  invite_id uuid := gen_random_uuid();
  doc_id uuid := gen_random_uuid();
  test_level public.member_level;
begin
  perform set_config('request.jwt.claims', '{}', true);
  insert into public.members (id, email, level) values
    (master_id, master_id || '@delete-test.local', 'master'),
    (target_id, target_id || '@delete-test.local', 'operacao'),
    (invite_id, invite_id || '@delete-test.local', 'operacao');
  insert into auth.users (id, email) values
    (master_auth, master_id || '@delete-test.local'),
    (target_auth, target_id || '@delete-test.local');
  insert into auth.sessions (id, user_id) values (gen_random_uuid(), target_auth);
  insert into public.documents (id, author_id, owner_id, visibility, deleted_at)
    values (doc_id, target_id, target_id, 'private', now());

  if has_function_privilege('anon', 'public.delete_member(uuid)', 'execute') then
    raise exception 'Anonymous callers can execute delete_member';
  end if;
  if not has_function_privilege('authenticated', 'public.delete_member(uuid)', 'execute') then
    raise exception 'Authenticated callers cannot execute delete_member';
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'members' and cmd in ('DELETE', 'ALL')) then
    raise exception 'Direct member deletion can bypass login cleanup';
  end if;

  perform pg_temp.expect_delete_error(target_id, 'Só um Master pode excluir pessoas.');
  perform set_config('request.jwt.claims', jsonb_build_object('sub', master_auth, 'aal', 'aal1')::text, true);
  perform pg_temp.expect_delete_error(target_id, 'Só um Master pode excluir pessoas.');

  foreach test_level in array array['operacao', 'gestor', 'admin']::public.member_level[] loop
    perform set_config('request.jwt.claims', '{}', true);
    other_id := gen_random_uuid();
    other_auth := gen_random_uuid();
    insert into public.members (id, email, level) values (other_id, other_id || '@delete-test.local', test_level);
    insert into auth.users (id, email) values (other_auth, other_id || '@delete-test.local');
    perform set_config('request.jwt.claims', jsonb_build_object('sub', other_auth, 'aal', 'aal2')::text, true);
    perform pg_temp.expect_delete_error(target_id, 'Só um Master pode excluir pessoas.');
  end loop;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', master_auth, 'aal', 'aal2')::text, true);
  perform pg_temp.expect_delete_error(master_id, 'Você não pode excluir sua própria conta.');
  perform pg_temp.expect_delete_error(gen_random_uuid(), 'Pessoa não encontrada.');
  perform pg_temp.expect_delete_error(target_id, 'Essa pessoa possui documentos. Desative o acesso e transfira os documentos em Editar antes de excluir.');

  -- Being responsible for a document is also enough to block deletion.
  perform set_config('devdoc.transfer', 'on', true);
  update public.documents set author_id = master_id where id = doc_id;
  perform pg_temp.expect_delete_error(target_id, 'Essa pessoa possui documentos. Desative o acesso e transfira os documentos em Editar antes de excluir.');
  update public.documents set owner_id = master_id where id = doc_id;
  perform set_config('devdoc.transfer', 'off', true);

  perform pg_temp.expect_delete_error(target_id, 'Simulated login deletion failure');
  if not exists (select 1 from public.members where id = target_id)
    or not exists (select 1 from auth.users where id = target_auth)
    or not exists (select 1 from auth.sessions where user_id = target_auth)
    or exists (select 1 from public.audit_log where entity_id = target_id and action = 'pessoa removida') then
    raise exception 'Login failure did not roll back the whole deletion';
  end if;
  drop trigger reject_test_auth_delete on auth.users;

  perform public.delete_member(target_id);
  if exists (select 1 from public.members where id = target_id)
    or exists (select 1 from auth.users where id = target_auth)
    or exists (select 1 from auth.sessions where user_id = target_auth) then
    raise exception 'Member, login or session survived deletion';
  end if;
  if not exists (select 1 from public.documents where id = doc_id and author_id = master_id and owner_id = master_id) then
    raise exception 'Transferred document was lost';
  end if;
  if not exists (select 1 from public.audit_log where actor_id = master_id and entity_id = target_id and action = 'pessoa removida') then
    raise exception 'Deletion was not audited';
  end if;

  perform public.delete_member(invite_id);
  if exists (select 1 from public.members where id = invite_id) then
    raise exception 'An invitation without a login could not be deleted';
  end if;
  raise notice 'PASS: permissions, MFA, self-deletion, documents, atomic rollback, login/session cleanup, invitations and audit';
end;
$$;

rollback;
