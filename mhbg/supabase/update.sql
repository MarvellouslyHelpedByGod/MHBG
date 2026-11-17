-- =====================================================================
-- Update: team roles, shared printing, programme countdown
-- Run AFTER schema.sql (and seed.sql). Safe to run more than once.
--
-- Roles
--   super_admin : everything, plus adding/removing team members and roles
--   admin       : everything except managing the team
--   checkin     : check-in volunteer — only the Check-in screen
-- =====================================================================

alter table public.admins add column if not exists role text not null default 'admin';
do $$ begin
  alter table public.admins add constraint admins_role_check check (role in ('super_admin','admin','checkin'));
exception when duplicate_object then null; end $$;

-- Full admins (super_admin + admin). Used by all content/settings rules.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role in ('super_admin','admin'));
$$;

-- Anyone on the team, including check-in volunteers.
create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid() and role = 'super_admin');
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.admins where user_id = auth.uid();
$$;

-- Volunteers can look people up (for "I lost my code") but not edit or delete.
drop policy if exists "staff read registrations" on public.registrations;
create policy "staff read registrations" on public.registrations
  for select to authenticated using (public.is_staff());

-- ---------------------------------------------------------------------
-- Check-in now works for every team member
-- ---------------------------------------------------------------------
create or replace function public.check_in(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r public.registrations;
  v_code text := upper(trim(p_code));
begin
  if not public.is_staff() then raise exception 'Not authorised'; end if;
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
   where id = r.id and checked_in_at is null returning * into r;
  if not found then  -- another volunteer got there a split second earlier
    select * into r from public.registrations where code = v_code;
    return jsonb_build_object('status', 'already', 'registration', to_jsonb(r));
  end if;
  return jsonb_build_object('status', 'checked_in', 'registration', to_jsonb(r));
end $$;

create or replace function public.walk_in_register(
  p_full_name text, p_phone text, p_organisation text default null, p_category text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  conf public.conferences;
  r public.registrations;
begin
  if not public.is_staff() then raise exception 'Not authorised'; end if;
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
-- Printing: one slip per person, whichever device prints it
-- ---------------------------------------------------------------------
-- Returns true only for the first device to claim the slip, so a phone and a
-- print station never both print the same person.
create or replace function public.claim_tag_print(p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.is_staff() then raise exception 'Not authorised'; end if;
  update public.registrations set tag_printed_at = now() where id = p_id and tag_printed_at is null;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- Manual print / reprint
create or replace function public.mark_tag_printed(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Not authorised'; end if;
  update public.registrations set tag_printed_at = now() where id = p_id;
end $$;

-- ---------------------------------------------------------------------
-- Team management (super admin only)
-- ---------------------------------------------------------------------
create or replace function public.list_staff()
returns table (user_id uuid, email text, role text, added_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can manage the team.'; end if;
  return query
    select a.user_id, u.email::text, a.role, a.created_at, u.last_sign_in_at
      from public.admins a join auth.users u on u.id = a.user_id
     order by case a.role when 'super_admin' then 0 when 'admin' then 1 else 2 end, u.email;
end $$;

create or replace function public.add_staff_by_email(p_email text, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can manage the team.'; end if;
  if p_role not in ('super_admin','admin','checkin') then raise exception 'Unknown role.'; end if;
  select id into uid from auth.users where lower(email) = lower(trim(p_email));
  if uid is null then
    raise exception 'There is no account with that email yet. Enter a password to create one.';
  end if;
  if p_role <> 'super_admin'
     and exists (select 1 from public.admins where user_id = uid and role = 'super_admin')
     and (select count(*) from public.admins where role = 'super_admin') <= 1 then
    raise exception 'There must always be at least one super admin.';
  end if;
  insert into public.admins (user_id, role) values (uid, p_role)
  on conflict (user_id) do update set role = excluded.role;
end $$;

create or replace function public.set_staff_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can manage the team.'; end if;
  if p_role not in ('super_admin','admin','checkin') then raise exception 'Unknown role.'; end if;
  if p_role <> 'super_admin'
     and exists (select 1 from public.admins where user_id = p_user_id and role = 'super_admin')
     and (select count(*) from public.admins where role = 'super_admin') <= 1 then
    raise exception 'There must always be at least one super admin.';
  end if;
  update public.admins set role = p_role where user_id = p_user_id;
end $$;

create or replace function public.remove_staff(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'Only a super admin can manage the team.'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot remove yourself.'; end if;
  if exists (select 1 from public.admins where user_id = p_user_id and role = 'super_admin')
     and (select count(*) from public.admins where role = 'super_admin') <= 1 then
    raise exception 'There must always be at least one super admin.';
  end if;
  delete from public.admins where user_id = p_user_id;
end $$;

-- Only signed-in users may call these (each one also checks the caller's role).
do $$
declare f text;
begin
  foreach f in array array[
    'list_staff()', 'add_staff_by_email(text,text)', 'set_staff_role(uuid,text)', 'remove_staff(uuid)',
    'claim_tag_print(uuid)', 'mark_tag_printed(uuid)', 'check_in(text)',
    'walk_in_register(text,text,text,text)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    begin execute format('grant execute on function public.%s to authenticated', f);
    exception when undefined_object then null; end;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Countdown: a programme's start and end time (Nigeria time)
-- ---------------------------------------------------------------------
alter table public.conferences add column if not exists start_time time;
alter table public.conferences add column if not exists end_time   time;

-- ---------------------------------------------------------------------
-- Make the main account the super admin
-- ---------------------------------------------------------------------
insert into public.admins (user_id, role)
select id, 'super_admin' from auth.users where lower(email) = 'marvellouslyhelpedbygod@gmail.com'
on conflict (user_id) do update set role = 'super_admin';

-- Check: should list marvellouslyhelpedbygod@gmail.com as super_admin
select u.email, a.role from public.admins a join auth.users u on u.id = a.user_id order by a.role desc;
