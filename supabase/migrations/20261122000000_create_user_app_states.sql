-- ==============================================================================
-- Schema for Mi Salud Pro - Strict Multi-Tenant Isolation via Row Level Security
-- ==============================================================================

create table if not exists public.user_app_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  profile jsonb not null default '{}'::jsonb,
  habits_by_date jsonb not null default '{}'::jsonb,
  meals jsonb not null default '[]'::jsonb,
  measurements jsonb not null default '[]'::jsonb,
  workout_sessions jsonb not null default '[]'::jsonb,
  kegel_sessions jsonb not null default '[]'::jsonb,
  daily_notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS) - Denies all access by default
alter table public.user_app_states enable row level security;

-- Drop old policies if they exist
drop policy if exists "Allow all access to user_app_states" on public.user_app_states;
drop policy if exists "Users can view own state" on public.user_app_states;
drop policy if exists "Users can insert own state" on public.user_app_states;
drop policy if exists "Users can update own state" on public.user_app_states;
drop policy if exists "Users can delete own state" on public.user_app_states;

-- 1. Strict SELECT: A user can ONLY view their own records
create policy "Users can view own state"
  on public.user_app_states
  for select
  to authenticated
  using (auth.uid() = user_id);

-- 2. Strict INSERT: A user can ONLY insert rows where user_id matches auth.uid()
create policy "Users can insert own state"
  on public.user_app_states
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 3. Strict UPDATE: A user can ONLY update their own records
create policy "Users can update own state"
  on public.user_app_states
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. Strict DELETE: A user can ONLY delete their own records
create policy "Users can delete own state"
  on public.user_app_states
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Auto-provision user state row whenever a new user registers in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_app_states (user_id, email, profile, updated_at)
  values (
    new.id,
    new.email,
    jsonb_build_object(
      'id', new.id,
      'name', coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
      'email', new.email
    ),
    now()
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
