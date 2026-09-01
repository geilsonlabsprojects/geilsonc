create or replace function public.sync_credits()
returns profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  s public.app_settings;
  p public.profiles;
  uid uuid := auth.uid();
  uemail text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into s from public.app_settings where id = 1;
  select email into uemail from auth.users where id = uid;

  insert into public.profiles (user_id, email, base_credits, current_credits, renewal_interval_seconds)
  values (uid, uemail, s.default_base_credits, s.default_base_credits,
          s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int)
  on conflict (user_id) do nothing;

  if lower(coalesce(uemail,'')) = 'geilsonlabsprojects@gmail.com' then
    insert into public.user_roles (user_id, role) values (uid, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  update public.profiles
     set current_credits = base_credits,
         last_renewal_at = now(),
         renewal_interval_seconds = s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int,
         updated_at = now()
   where user_id = uid
     and now() >= last_renewal_at + make_interval(secs => renewal_interval_seconds);

  select * into p from public.profiles where user_id = uid;
  return p;
end $function$;