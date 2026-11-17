-- =====================================================================
-- Marvellously Helped by God — Supabase schema
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Site settings (single row)
-- ---------------------------------------------------------------------
create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  whatsapp_number text,
  contact_email text,
  phone text,
  address text,
  instagram_url text,
  facebook_url text,
  youtube_url text,
  founder_bio text,
  founder_photo_url text,
  hero_image_url text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

alter table public.site_settings enable row level security;
drop policy if exists "settings public read" on public.site_settings;
create policy "settings public read" on public.site_settings for select using (true);
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Conferences (one active at a time)
-- ---------------------------------------------------------------------
create table if not exists public.conferences (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  theme text,
  event_date date,
  time_text text,
  venue text,
  description text,
  is_active boolean not null default true,
  registration_open boolean not null default true,
  capacity int,
  categories text[] not null default array['Participant'],
  checkin_mode text not null default 'both' check (checkin_mode in ('qr','voucher','both')),
  tag_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists one_active_conference on public.conferences (is_active) where is_active;

alter table public.conferences enable row level security;
drop policy if exists "conference public read" on public.conferences;
create policy "conference public read" on public.conferences for select using (is_active or public.is_admin());
drop policy if exists "conference admin all" on public.conferences;
create policy "conference admin all" on public.conferences
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references public.conferences(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text,
  organisation text,
  category text,
  code text not null unique,
  source text not null default 'online' check (source in ('online','walk_in')),
  checked_in_at timestamptz,
  checked_in_by uuid,
  tag_printed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists registrations_conf_idx on public.registrations (conference_id, created_at desc);

alter table public.registrations enable row level security;
drop policy if exists "registrations admin all" on public.registrations;
create policy "registrations admin all" on public.registrations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
-- No public policies: the public registers only through the functions below.

create or replace function public.norm_phone(p text)
returns text language sql immutable as $$
  select case
    when d like '234%' then '0' || substr(d, 4)
    else d end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) s;
$$;

create or replace function public.gen_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  c text;
begin
  loop
    c := 'MH-';
    for i in 1..6 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.registrations where code = c);
  end loop;
  return c;
end $$;

-- Public online registration
create or replace function public.register_for_conference(
  p_full_name text, p_phone text, p_email text default null,
  p_organisation text default null, p_category text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  conf public.conferences;
  r public.registrations;
  n int;
begin
  select * into conf from public.conferences where is_active limit 1;
  if not found then raise exception 'There is no conference open for registration right now.'; end if;
  if not conf.registration_open then raise exception 'Registration is closed.'; end if;

  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Please enter your full name.'; end if;
  if length(norm_phone(p_phone)) < 7 then raise exception 'Please enter a valid phone number.'; end if;

  -- Same person registering twice gets their existing code back
  select * into r from public.registrations
   where conference_id = conf.id
     and norm_phone(phone) = norm_phone(p_phone)
     and lower(trim(full_name)) = lower(trim(p_full_name))
   limit 1;
  if found then
    return jsonb_build_object('code', r.code, 'full_name', r.full_name, 'existing', true);
  end if;

  if conf.capacity is not null then
    select count(*) into n from public.registrations where conference_id = conf.id;
    if n >= conf.capacity then raise exception 'Registration is full.'; end if;
  end if;

  insert into public.registrations (conference_id, full_name, phone, email, organisation, category, code, source)
  values (conf.id, trim(p_full_name), trim(p_phone), nullif(trim(p_email), ''), nullif(trim(p_organisation), ''),
          coalesce(nullif(p_category, ''), conf.categories[1], 'Participant'), gen_code(), 'online')
  returning * into r;

  return jsonb_build_object('code', r.code, 'full_name', r.full_name, 'existing', false);
end $$;

-- Public "I lost my code" lookup (needs both phone and name)
create or replace function public.find_registration(p_phone text, p_full_name text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare r public.registrations;
begin
  select reg.* into r from public.registrations reg
    join public.conferences c on c.id = reg.conference_id and c.is_active
   where norm_phone(reg.phone) = norm_phone(p_phone)
     and lower(trim(reg.full_name)) = lower(trim(p_full_name))
   limit 1;
  if not found then return null; end if;
  return jsonb_build_object('code', r.code, 'full_name', r.full_name);
end $$;

-- Admin: check someone in by QR or voucher code
create or replace function public.check_in(p_code text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  r public.registrations;
  v_code text := upper(trim(p_code));
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;
  select reg.* into r from public.registrations reg
    join public.conferences c on c.id = reg.conference_id and c.is_active
   where reg.code = v_code;
  if not found then
    return jsonb_build_object('status', 'not_found', 'code', v_code);
  end if;
  if r.checked_in_at is not null then
    return jsonb_build_object('status', 'already', 'registration', to_jsonb(r));
  end if;
  update public.registrations set checked_in_at = now(), checked_in_by = auth.uid()
   where id = r.id returning * into r;
  return jsonb_build_object('status', 'checked_in', 'registration', to_jsonb(r));
end $$;

-- Admin: register a walk-in on site and mark them present at once
create or replace function public.walk_in_register(
  p_full_name text, p_phone text, p_organisation text default null, p_category text default null)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  conf public.conferences;
  r public.registrations;
begin
  if not public.is_admin() then raise exception 'Not authorised'; end if;
  select * into conf from public.conferences where is_active limit 1;
  if not found then raise exception 'No active conference.'; end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then raise exception 'Enter the full name.'; end if;

  insert into public.registrations (conference_id, full_name, phone, organisation, category, code, source, checked_in_at, checked_in_by)
  values (conf.id, trim(p_full_name), coalesce(nullif(trim(p_phone), ''), '-'), nullif(trim(p_organisation), ''),
          coalesce(nullif(p_category, ''), conf.categories[1], 'Participant'), gen_code(), 'walk_in', now(), auth.uid())
  returning * into r;
  return jsonb_build_object('status', 'checked_in', 'registration', to_jsonb(r));
end $$;

-- ---------------------------------------------------------------------
-- Testimonies
-- ---------------------------------------------------------------------
create table if not exists public.testimonies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  title text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
alter table public.testimonies enable row level security;
drop policy if exists "testimonies public read approved" on public.testimonies;
create policy "testimonies public read approved" on public.testimonies
  for select using (status = 'approved' or public.is_admin());
drop policy if exists "testimonies public submit" on public.testimonies;
create policy "testimonies public submit" on public.testimonies
  for insert to anon, authenticated with check (status = 'pending' and approved_at is null);
drop policy if exists "testimonies admin update" on public.testimonies;
create policy "testimonies admin update" on public.testimonies
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "testimonies admin delete" on public.testimonies;
create policy "testimonies admin delete" on public.testimonies
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Gallery
-- ---------------------------------------------------------------------
create table if not exists public.gallery_items (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  caption text,
  width int,
  height int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.gallery_items enable row level security;
drop policy if exists "gallery public read" on public.gallery_items;
create policy "gallery public read" on public.gallery_items for select using (true);
drop policy if exists "gallery admin all" on public.gallery_items;
create policy "gallery admin all" on public.gallery_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Publications
-- ---------------------------------------------------------------------
create table if not exists public.publications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  published_on date,
  summary text,
  link_url text,
  file_path text,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.publications enable row level security;
drop policy if exists "publications public read" on public.publications;
create policy "publications public read" on public.publications
  for select using (is_published or public.is_admin());
drop policy if exists "publications admin all" on public.publications;
create policy "publications admin all" on public.publications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  subject text,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
drop policy if exists "messages public send" on public.messages;
create policy "messages public send" on public.messages
  for insert to anon, authenticated with check (is_read = false);
drop policy if exists "messages admin read" on public.messages;
create policy "messages admin read" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "messages admin update" on public.messages;
create policy "messages admin update" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "messages admin delete" on public.messages;
create policy "messages admin delete" on public.messages
  for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- Storage buckets (public read, admin write)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('gallery', 'gallery', true),
  ('publications', 'publications', true),
  ('site', 'site', true)
on conflict (id) do nothing;

drop policy if exists "admins manage site files" on storage.objects;
create policy "admins manage site files" on storage.objects
  for all to authenticated
  using (bucket_id in ('gallery','publications','site') and public.is_admin())
  with check (bucket_id in ('gallery','publications','site') and public.is_admin());

-- ---------------------------------------------------------------------
-- Realtime (admin dashboard updates live)
-- ---------------------------------------------------------------------
do $$
begin
  begin alter publication supabase_realtime add table public.registrations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.testimonies;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages;      exception when duplicate_object then null; end;
end $$;

-- ---------------------------------------------------------------------
-- v2: fields for the real site content (safe to run on an existing db)
-- ---------------------------------------------------------------------
alter table public.conferences   add column if not exists tagline   text;
alter table public.conferences   add column if not exists why_title text;
alter table public.conferences   add column if not exists why_body  text;
alter table public.gallery_items add column if not exists instagram_url text;
alter table public.gallery_items alter column image_path drop not null;
alter table public.messages      add column if not exists kind text not null default 'general';
alter table public.site_settings add column if not exists location text;
