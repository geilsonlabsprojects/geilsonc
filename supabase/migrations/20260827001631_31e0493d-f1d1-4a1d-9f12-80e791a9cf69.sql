
-- roles
create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- profiles
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  base_credits int not null default 100,
  current_credits int not null default 100,
  last_renewal_at timestamptz not null default now(),
  renewal_interval_seconds int not null default 10800,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- global settings
create table public.app_settings (
  id int primary key default 1,
  min_interval_seconds int not null default 7200,
  max_interval_seconds int not null default 18000,
  default_base_credits int not null default 100,
  updated_at timestamptz not null default now(),
  constraint one_row check (id = 1)
);
grant select on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;
create policy "anyone signed in reads settings" on public.app_settings for select to authenticated using (true);
create policy "admins update settings" on public.app_settings for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
insert into public.app_settings (id) values (1);

-- access codes
create table public.access_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type text not null default 'FREE',
  bonus_base_credits int not null default 0,
  instant_bonus int not null default 0,
  is_used boolean not null default false,
  used_by uuid references auth.users(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.access_codes to authenticated;
grant all on public.access_codes to service_role;
alter table public.access_codes enable row level security;
create policy "admins read codes" on public.access_codes for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- api keys
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  secret text not null,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);
grant select, insert, update, delete on public.api_keys to authenticated;
grant all on public.api_keys to service_role;
alter table public.api_keys enable row level security;
create policy "own api keys" on public.api_keys for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- usage logs
create table public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  provider text,
  model text,
  credits int not null default 0,
  cost_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.usage_logs to authenticated;
grant all on public.usage_logs to service_role;
alter table public.usage_logs enable row level security;
create policy "read own usage" on public.usage_logs for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- chats & messages
create table public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nova conversa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.chats to authenticated;
grant all on public.chats to service_role;
alter table public.chats enable row level security;
create policy "own chats" on public.chats for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  content text not null default '',
  model text,
  attachment_name text,
  attachment_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "own messages" on public.messages for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nota',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notes to authenticated;
grant all on public.notes to service_role;
alter table public.notes enable row level security;
create policy "own notes" on public.notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- images
create table public.generated_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null,
  model text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.generated_images to authenticated;
grant all on public.generated_images to service_role;
alter table public.generated_images enable row level security;
create policy "own images" on public.generated_images for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ===== credit engine =====
create or replace function public.sync_credits()
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare
  s public.app_settings;
  p public.profiles;
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into s from public.app_settings where id = 1;

  insert into public.profiles (user_id, email, base_credits, current_credits, renewal_interval_seconds)
  values (uid, (select email from auth.users where id = uid), s.default_base_credits, s.default_base_credits,
          s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int)
  on conflict (user_id) do nothing;

  update public.profiles
     set current_credits = base_credits,
         last_renewal_at = now(),
         renewal_interval_seconds = s.min_interval_seconds + floor(random()*(s.max_interval_seconds - s.min_interval_seconds))::int,
         updated_at = now()
   where user_id = uid
     and now() >= last_renewal_at + make_interval(secs => renewal_interval_seconds);

  select * into p from public.profiles where user_id = uid;
  return p;
end $$;

create or replace function public.spend_credits(_amount int, _action text, _provider text default null, _model text default null, _cost numeric default 0)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare p public.profiles; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform public.sync_credits();
  update public.profiles set current_credits = current_credits - _amount, updated_at = now()
   where user_id = uid and current_credits >= _amount
  returning * into p;
  if p.user_id is null then raise exception 'INSUFFICIENT_CREDITS'; end if;
  insert into public.usage_logs (user_id, action, provider, model, credits, cost_usd)
  values (uid, _action, _provider, _model, _amount, coalesce(_cost,0));
  return p;
end $$;

create or replace function public.redeem_access_code(_code text)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare c public.access_codes; p public.profiles; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  perform public.sync_credits();
  update public.access_codes
     set is_used = true, used_by = uid, used_at = now()
   where upper(code) = upper(trim(_code))
     and is_used = false
     and (expires_at is null or expires_at > now())
  returning * into c;
  if c.id is null then raise exception 'INVALID_CODE'; end if;

  update public.profiles
     set base_credits = base_credits + c.bonus_base_credits,
         current_credits = current_credits + c.instant_bonus + c.bonus_base_credits,
         updated_at = now()
   where user_id = uid
  returning * into p;

  insert into public.usage_logs (user_id, action, provider, credits)
  values (uid, 'redeem:' || c.type, 'system', -(c.instant_bonus + c.bonus_base_credits));
  return p;
end $$;

create or replace function public.admin_generate_codes(_type text, _count int, _bonus_base int, _instant int, _expires_at timestamptz default null)
returns setof public.access_codes
language plpgsql security definer set search_path = public as $$
declare i int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if _count < 1 or _count > 200 then raise exception 'INVALID_COUNT'; end if;
  for i in 1.._count loop
    return query
    insert into public.access_codes (code, type, bonus_base_credits, instant_bonus, expires_at)
    values (upper(_type) || '-' || upper(substr(md5(gen_random_uuid()::text),1,8)), upper(_type), _bonus_base, _instant, _expires_at)
    returning *;
  end loop;
end $$;

create or replace function public.admin_stats()
returns json language plpgsql security definer set search_path = public as $$
declare result json;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'active_today', (select count(distinct user_id) from public.usage_logs where created_at > now() - interval '1 day'),
    'credits_renewed_today', (select coalesce(sum(base_credits),0) from public.profiles where last_renewal_at > now() - interval '1 day'),
    'cost_today', (select coalesce(sum(cost_usd),0) from public.usage_logs where created_at > now() - interval '1 day'),
    'cost_total', (select coalesce(sum(cost_usd),0) from public.usage_logs),
    'by_provider', (select coalesce(json_agg(t),'[]'::json) from (
        select coalesce(provider,'desconhecido') as provider, count(*)::int as calls, coalesce(sum(cost_usd),0) as cost
        from public.usage_logs where created_at > now() - interval '30 days' group by 1 order by 2 desc) t),
    'daily', (select coalesce(json_agg(t),'[]'::json) from (
        select to_char(date_trunc('day', created_at),'DD/MM') as day, count(*)::int as calls,
               coalesce(sum(cost_usd),0) as cost, coalesce(sum(credits),0)::int as credits
        from public.usage_logs where created_at > now() - interval '14 days'
        group by date_trunc('day', created_at) order by date_trunc('day', created_at)) t)
  ) into result;
  return result;
end $$;

create or replace function public.admin_update_settings(_min int, _max int, _default_base int)
returns public.app_settings language plpgsql security definer set search_path = public as $$
declare s public.app_settings;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'FORBIDDEN'; end if;
  if _min < 600 or _max <= _min then raise exception 'INVALID_INTERVAL'; end if;
  update public.app_settings set min_interval_seconds=_min, max_interval_seconds=_max,
    default_base_credits=_default_base, updated_at=now() where id=1 returning * into s;
  return s;
end $$;

-- first signed-in user with no admin present becomes admin (bootstrap)
create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if exists (select 1 from public.user_roles where role='admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (uid,'admin') on conflict do nothing;
  return true;
end $$;
