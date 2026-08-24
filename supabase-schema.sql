-- Gerencia Ponto: schema and row-level security
-- Gerencia Ponto: esquema e seguranca por linha

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workday_minutes integer not null default 528 check (workday_minutes > 0),
  lunch_minutes integer not null default 60 check (lunch_minutes >= 0),
  lunch_paid boolean not null default false,
  max_overtime_minutes integer not null default 120 check (max_overtime_minutes >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.workdays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  entry_at timestamptz,
  lunch_start_at timestamptz,
  lunch_end_at timestamptz,
  exit_at timestamptz,
  entry_source text not null default 'automatic' check (entry_source in ('automatic', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, work_date)
);

alter table public.profiles enable row level security;
alter table public.work_settings enable row level security;
alter table public.workdays enable row level security;

drop policy if exists "profiles own rows" on public.profiles;
create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "settings own rows" on public.work_settings;
create policy "settings own rows" on public.work_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "workdays own rows" on public.workdays;
create policy "workdays own rows" on public.workdays for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name) values (new.id, new.raw_user_meta_data ->> 'name');
  insert into public.work_settings (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
