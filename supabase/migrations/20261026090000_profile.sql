-- Profile: each person changes only their own photo (and password, in Supabase Auth).
-- Name and level stay with Admins; email changes only by a Master.

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

  if new.email <> old.email and not public.is_master() then
    raise exception 'Só um Master altera o e-mail';
  end if;

  -- A photo is either removed or one the person uploaded to their own folder. No outside links.
  if new.avatar_url is distinct from old.avatar_url and new.avatar_url is not null
     and new.avatar_url !~ ('^/api/avatar/' || new.id::text || '/[A-Za-z0-9_.-]+$') then
    raise exception 'Foto inválida';
  end if;

  if not public.is_admin() then
    if new.level <> old.level or new.active <> old.active or new.full_name <> old.full_name
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
    if new.email <> old.email then
      perform public.audit('e-mail alterado', 'pessoa', new.id, jsonb_build_object('de', old.email, 'para', new.email));
    end if;
  end if;
  return new;
end $$;

-- Profile photos: private bucket, read by any member through /api/avatar, written only by the owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars read by members" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and public.current_member_id() is not null);
create policy "avatars upload own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_member_id()::text);
create policy "avatars delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = public.current_member_id()::text);
