-- Keep profile roles aligned with the role values used by the application.
-- Existing installations may still have the older client value in the check.
alter table public.profiles drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'sales', 'customer', 'client'));

update public.profiles
set role = 'customer'
where role = 'client';