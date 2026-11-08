alter table public.packages
  add column if not exists price_unit text not null default 'per paket';