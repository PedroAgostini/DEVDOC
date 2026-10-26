-- MFA for everyone, enforced by the database: a session only counts as a DEVDOC member
-- after the second factor (aal2). A stolen password alone reads nothing, not even through the API.

create or replace function public.current_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.members
  where auth_user_id = auth.uid()
    and active
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;

-- Used by the admin "redefinir verificação" action (service role only): ends every session of a person.
create or replace function public.revoke_sessions(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from auth.sessions where user_id = p_user
$$;
revoke execute on function public.revoke_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_sessions(uuid) to service_role;

create or replace function public.current_level()
returns public.member_level language sql stable security definer set search_path = public as $$
  select level from public.members
  where auth_user_id = auth.uid()
    and active
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
$$;
