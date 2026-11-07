alter table public.profiles
  add column if not exists balance numeric(12, 2) not null default 0;