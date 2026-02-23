-- ============================================
-- LABBOOK — Supabase Database Setup Script
-- Run this in: Supabase → SQL Editor → New query
-- ============================================

-- 1. PROFILES TABLE (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text,
  role text not null default 'viewer' check (role in ('viewer', 'approver', 'admin')),
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. EQUIPMENT TABLE
create table public.equipment (
  id uuid default gen_random_uuid() primary key,
  asset_tag text unique,
  name text not null,
  location text,
  floor text,
  category text,
  training_required boolean default false,
  requires_approval boolean default false,
  owner_name text,
  notes text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. BOOKINGS TABLE
create table public.bookings (
  id uuid default gen_random_uuid() primary key,
  equipment_id uuid references public.equipment on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  booking_type text not null check (booking_type in ('timeslot', 'halfday', 'fullday', 'multiday')),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'rejected', 'cancelled')),
  notes text,
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz default now()
);

-- 4. ROW LEVEL SECURITY (RLS)

-- Profiles: users can see all profiles (for approvers to see names), edit own
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Equipment: viewable by all authenticated, editable by admins only (via service role)
alter table public.equipment enable row level security;

create policy "Equipment viewable by authenticated users"
  on public.equipment for select
  using (auth.role() = 'authenticated');

create policy "Admins can manage equipment"
  on public.equipment for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Bookings: users see own, admins/approvers see all
alter table public.bookings enable row level security;

create policy "Users can see own bookings"
  on public.bookings for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'approver')
    )
  );

create policy "Authenticated users can create bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Users can cancel own bookings"
  on public.bookings for update
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'approver')
    )
  );

create policy "Admins can delete bookings"
  on public.bookings for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 5. INDEXES for performance
create index idx_bookings_equipment_id on public.bookings(equipment_id);
create index idx_bookings_user_id on public.bookings(user_id);
create index idx_bookings_start_time on public.bookings(start_time);
create index idx_bookings_status on public.bookings(status);
create index idx_equipment_active on public.equipment(active);
create index idx_equipment_category on public.equipment(category);
create index idx_equipment_floor on public.equipment(floor);

-- 6. MAKE YOURSELF AN ADMIN
-- After you sign up, run this with YOUR email to give yourself admin access:
-- update public.profiles set role = 'admin' where email = 'your.email@lilly.com';

-- ============================================
-- DONE! Your database is ready.
-- ============================================
