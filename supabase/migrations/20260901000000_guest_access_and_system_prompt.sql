-- Guest sessions are anonymous Supabase users: no e-mail, password, or OAuth login is required.
alter table public.profiles
  add column if not exists is_guest boolean not null default false,
  add column if not exists guest_renewal_count int not null default 0;

alter table public.app_settings
  add column if not exists system_prompt text not null default
    'Você é o assistente do Hub de IA Universal. Responda de forma clara, útil e em markdown quando ajudar.';

-- Keep the renewal atomic and cap anonymous sessions at five automatic recharges.
create or replace function public.sync_credits()
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  s public.app_settings;
  p public.profiles;
  uid uuid := auth.uid();
  guest boolean := coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into s from public.app_settings where id = 1;

  insert into public.profiles (user_id, email, base_credits, current_credits, renewal_interval_seconds, is_guest)
  values (uid, (select email from auth.users where id = uid), s.default_base_credits, s.default_base_credits,
          s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int, guest)
  on conflict (user_id) do nothing;

  update public.profiles
     set current_credits = base_credits,
         last_renewal_at = now(),
         renewal_interval_seconds = s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int,
         guest_renewal_count = case when is_guest then guest_renewal_count + 1 else guest_renewal_count end,
         updated_at = now()
   where user_id = uid
     and now() >= last_renewal_at + make_interval(secs => renewal_interval_seconds)
     and (not is_guest or guest_renewal_count < 5);

  select * into p from public.profiles where user_id = uid;
  return p;
end $$;

drop function if exists public.admin_update_settings(int, int, int);
create function public.admin_update_settings(_min int, _max int, _default_base int, _system_prompt text)
returns public.app_settings language plpgsql security definer set search_path = public as $$
declare s public.app_settings;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if _min < 600 or _max <= _min or _default_base < 0 then raise exception 'INVALID_INTERVAL'; end if;
  if length(trim(_system_prompt)) < 10 or length(_system_prompt) > 12000 then raise exception 'INVALID_SYSTEM_PROMPT'; end if;
  update public.app_settings set min_interval_seconds=_min, max_interval_seconds=_max,
    default_base_credits=_default_base, system_prompt=trim(_system_prompt), updated_at=now()
    where id=1 returning * into s;
  return s;
end $$;

revoke execute on function public.admin_update_settings(int, int, int, text) from public, anon;
grant execute on function public.admin_update_settings(int, int, int, text) to authenticated;
